package controllers

import (
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func DashboardController(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userEmailVal := c.Locals("userEmail")
		userEmail, ok := userEmailVal.(string)
		if !ok || userEmail == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}
		var user models.User
		if err := db.Preload("ProviderProfile").First(&user, "email = ?", userEmail).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		switch user.Role {
		case "provider":
			return c.JSON(fiber.Map{"role": "provider", "profile": user.ProviderProfile})
		default:
			// default to customer
			return c.JSON(fiber.Map{"role": "customer"})
		}
	}
}
