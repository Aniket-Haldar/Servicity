package controllers

import (
	"errors"
	"strconv"

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

// UpdateProfile handles updating user profile information (for authenticated user)
// POST /profile/update
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
// GET /profile/details
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

// PutProfile allows admin or user to update a profile by its ID (like service PUT)
// PUT /profile/:id
func PutProfile(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idStr := c.Params("id")
		profileID, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil || profileID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Profile ID must be a valid integer"})
		}

		var input ProfileUpdateInput
		if err := c.BodyParser(&input); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid input format"})
		}

		if input.Role == "Provider" {
			var profile models.ProviderProfile
			if err := db.First(&profile, profileID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return c.Status(404).JSON(fiber.Map{"error": "Provider profile not found"})
				}
				return c.Status(500).JSON(fiber.Map{"error": "Database error"})
			}

			profile.Profession = input.Profession
			profile.Pincode = input.Pincode
			profile.Pricing = input.Pricing
			profile.AvailableTimings = input.AvailableTimings

			if err := db.Save(&profile).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to update provider profile"})
			}

			// Optionally update user basic info
			var user models.User
			if err := db.First(&user, profile.UserID).Error; err == nil {
				user.Name = input.Name
				user.Role = input.Role
				_ = db.Save(&user)
			}

			return c.JSON(fiber.Map{
				"id":               profile.ID,
				"user_id":          profile.UserID,
				"profession":       profile.Profession,
				"pincode":          profile.Pincode,
				"pricing":          profile.Pricing,
				"availableTimings": profile.AvailableTimings,
			})
		} else if input.Role == "Customer" {
			var profile models.CustomerProfile
			if err := db.First(&profile, profileID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return c.Status(404).JSON(fiber.Map{"error": "Customer profile not found"})
				}
				return c.Status(500).JSON(fiber.Map{"error": "Database error"})
			}

			profile.Address = input.Address
			profile.Phone = input.Phone

			if err := db.Save(&profile).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to update customer profile"})
			}

			// Optionally update user basic info
			var user models.User
			if err := db.First(&user, profile.UserID).Error; err == nil {
				user.Name = input.Name
				user.Role = input.Role
				_ = db.Save(&user)
			}

			return c.JSON(fiber.Map{
				"id":      profile.ID,
				"user_id": profile.UserID,
				"address": profile.Address,
				"phone":   profile.Phone,
			})
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "Role must be either 'Provider' or 'Customer'"})
		}
	}
}
func GetUserByID(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idStr := c.Params("id")
		userID, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil || userID == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "User ID must be a valid integer",
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
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		}

		// Attach appropriate profile based on role
		switch user.Role {
		case "Provider":
			var profile models.ProviderProfile
			if err := db.Where("user_id = ?", user.ID).First(&profile).Error; err == nil {
				response["profile"] = profile
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to retrieve provider profile",
				})
			}
		case "Customer":
			var profile models.CustomerProfile
			if err := db.Where("user_id = ?", user.ID).First(&profile).Error; err == nil {
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
