package controllers

import (
	"errors"
	"strconv"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// POST /reviews
func CreateReview(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var review models.Review
		if err := c.BodyParser(&review); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		// Basic validation
		if review.CustomerID == 0 || review.ProviderID == 0 || review.Rating < 1 || review.Rating > 5 {
			return c.Status(400).JSON(fiber.Map{"error": "Missing or invalid fields"})
		}

		if err := db.Create(&review).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusCreated).JSON(review)
	}
}

// GET /reviews
func GetAllReviews(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var reviews []models.Review
		if err := db.Find(&reviews).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(reviews)
	}
}

// GET /reviews/:id
func GetReview(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}
		var review models.Review
		if err := db.First(&review, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Review not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		return c.JSON(review)
	}
}

// GET /providers/:id/reviews
func GetProviderReviews(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idStr := c.Params("id")
		providerID, err := strconv.Atoi(idStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid provider ID"})
		}
		var reviews []models.Review
		if err := db.Where("provider_id = ?", providerID).Find(&reviews).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(reviews)
	}
}

// GET /customers/:id/reviews
func GetCustomerReviews(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idStr := c.Params("id")
		customerID, err := strconv.Atoi(idStr)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid customer ID"})
		}
		var reviews []models.Review
		if err := db.Where("customer_id = ?", customerID).Find(&reviews).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(reviews)
	}
}

// PATCH /reviews/:id
func UpdateReview(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}
		var review models.Review
		if err := db.First(&review, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Review not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		var updateData models.Review
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		if err := db.Model(&review).Updates(updateData).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update review"})
		}
		return c.JSON(review)
	}
}

// DELETE /reviews/:id
func DeleteReview(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}
		var review models.Review
		if err := db.First(&review, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Review not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		if err := db.Delete(&review).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete review"})
		}
		return c.JSON(fiber.Map{"message": "Successfully deleted"})
	}
}
