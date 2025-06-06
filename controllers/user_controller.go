package controllers

import (
	"errors"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ProfileUpdateInput struct {
	Name string `json:"name" validate:"required"`
	Role string `json:"role" validate:"required,oneof=Provider Customer"`

	// Provider fields
	Profession       string  `json:"profession,omitempty"`
	Pincode          string  `json:"pincode,omitempty"`
	Pricing          float64 `json:"pricing,omitempty"`
	AvailableTimings string  `json:"availableTimings,omitempty"`

	// Customer fields
	Address string `json:"address,omitempty"`
	Phone   string `json:"phone,omitempty"`
}

// UpdateProfile handles updating user profile information
func UpdateProfile(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID").(uint)

		var input ProfileUpdateInput
		if err := c.BodyParser(&input); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid input format",
			})
		}

		// Start a transaction to ensure data consistency
		err := db.Transaction(func(tx *gorm.DB) error {
			// Update user basic info
			var user models.User
			if err := tx.First(&user, userID).Error; err != nil {
				return err
			}

			user.Name = input.Name
			user.Role = input.Role
			if err := tx.Save(&user).Error; err != nil {
				return err
			}

			// Handle profile based on role
			switch input.Role {
			case "Provider":
				// Delete customer profile if exists
				if err := tx.Where("user_id = ?", userID).Delete(&models.CustomerProfile{}).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}

				// Create or update provider profile
				providerProfile := models.ProviderProfile{
					UserID:           userID,
					Profession:       input.Profession,
					Pincode:          input.Pincode,
					Pricing:          input.Pricing,
					AvailableTimings: input.AvailableTimings,
				}
				if err := tx.Where(models.ProviderProfile{UserID: userID}).
					Assign(providerProfile).
					FirstOrCreate(&providerProfile).Error; err != nil {
					return err
				}

			case "Customer":
				// Delete provider profile if exists
				if err := tx.Where("user_id = ?", userID).Delete(&models.ProviderProfile{}).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
					return err
				}

				// Create or update customer profile
				customerProfile := models.CustomerProfile{
					UserID:  userID,
					Address: input.Address,
					Phone:   input.Phone,
				}
				if err := tx.Where(models.CustomerProfile{UserID: userID}).
					Assign(customerProfile).
					FirstOrCreate(&customerProfile).Error; err != nil {
					return err
				}

			default:
				return errors.New("invalid role specified")
			}

			return nil
		})

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update profile",
			})
		}

		return c.JSON(fiber.Map{
			"status":  "success",
			"message": "Profile updated successfully",
		})
	}
}

// GetProfile retrieves the user's profile information
func GetProfile(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uint)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized: invalid user ID",
			})
		}

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "User not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to retrieve user data",
			})
		}

		response := fiber.Map{
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		}

		// Get appropriate profile based on role
		switch user.Role {
		case "Provider":
			var profile models.ProviderProfile
			if err := db.Where("user_id = ?", userID).First(&profile).Error; err == nil {
				response["profile"] = profile
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to retrieve provider profile",
				})
			}

		case "Customer":
			var profile models.CustomerProfile
			if err := db.Where("user_id = ?", userID).First(&profile).Error; err == nil {
				response["profile"] = profile
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to retrieve customer profile",
				})
			}
		}

		return c.JSON(response)
	}
}
