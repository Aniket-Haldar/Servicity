package controllers

import (
	"context"
	"encoding/json"
	"io"

	"github.com/Aniket-Haldar/Servicity/config"
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/utils"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

// Redirect to Google OAuth login
func GoogleLogin(c *fiber.Ctx) error {
	url := config.GoogleOAuthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	return c.Redirect(url)
}

// Handle Google OAuth callback
func GoogleCallback(db *gorm.DB, c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).SendString("Code not found in query params")
	}

	token, err := config.GoogleOAuthConfig.Exchange(context.Background(), code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Token exchange failed: " + err.Error())
	}

	client := config.GoogleOAuthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to get user info: " + err.Error())
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to read response: " + err.Error())
	}

	var userInfo map[string]interface{}
	if err := json.Unmarshal(data, &userInfo); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to parse user info: " + err.Error())
	}

	email, ok := userInfo["email"].(string)
	if !ok || email == "" {
		return c.Status(fiber.StatusInternalServerError).SendString("Email not found in user info")
	}

	user := models.User{}
	result := db.Preload("CustomerProfile").Preload("ProviderProfile").First(&user, "email = ?", email)

	if result.Error != nil {

		user = models.User{
			Email: email,
			Role:  "customer", // default role
		}
		if err := db.Create(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).SendString("Failed to create user: " + err.Error())
		}
	}

	jwtToken, err := utils.GenerateJWT(email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to generate JWT: " + err.Error())
	}

	//cookie proceess
	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    jwtToken,
		HTTPOnly: false,
		Secure:   false,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   86400,
	})

	// Onboarding check
	if user.Name == "" || user.Role == "" ||
		(user.Role == "customer" && user.CustomerProfile.Phone == "") ||
		(user.Role == "provider" && user.ProviderProfile.Pincode == "") {
		return c.Redirect("http://localhost:5500/frontend/html/onboarding.html")
	}

	// Redirect to landing page
	return c.Redirect("http://localhost:5500/frontend/html/index.html")
}
