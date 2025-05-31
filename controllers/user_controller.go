package controllers

import (
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ProfileUpdateInput struct {
	Name string
	Role string

	//provider will enter this
	Profession       string
	Pincode          string
	Pricing          float64
	AvailableTimings string `json:"availableTimings"`

	//customer will enter this
	Address string
	Phone   string
}

func UpdateProfile(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID").(uint)

		var input ProfileUpdateInput
		if err := c.BodyParser(&input); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
		}

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
		}

		user.Name = input.Name
		user.Role = input.Role
		if err := db.Save(&user).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not update user"})
		}

		if input.Role == "Provider" {
			profile := models.ProviderProfile{
				UserID:           userID,
				Profession:       input.Profession,
				Pincode:          input.Pincode,
				Pricing:          input.Pricing,
				AvailableTimings: input.AvailableTimings,
			}
			db.Where("user_id = ?", userID).Delete(&models.CustomerProfile{})
			db.Where("user_id = ?", userID).FirstOrCreate(&profile)
		} else if input.Role == "Customer" {
			profile := models.CustomerProfile{
				UserID:  userID,
				Address: input.Address,
				Phone:   input.Phone,
			}
			db.Where("user_id = ?", userID).Delete(&models.ProviderProfile{})
			db.Where("user_id = ?", userID).FirstOrCreate(&profile)
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid role"})
		}

		return c.JSON(fiber.Map{"status": "Profile updated successfully"})
	}
}
func GetProfile(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uint)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized: user ID not found in token",
			})
		}

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "User not found",
			})
		}

		response := fiber.Map{
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		}

		if user.Role == "provider" {
			var profile models.ProviderProfile
			if err := db.Where("user_id = ?", userID).First(&profile).Error; err == nil {
				response["profile"] = profile
			}
		} else {
			var profile models.CustomerProfile
			if err := db.Where("user_id = ?", userID).First(&profile).Error; err == nil {
				response["profile"] = profile
			}
		}

		return c.JSON(response)
	}
}
