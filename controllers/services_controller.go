package controllers

import (
	"errors"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// CreateService creates a new service, always setting ProviderID from the authenticated user context
func CreateService(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var service models.Service
		if err := c.BodyParser(&service); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		// Get provider ID from JWT/session (set by your authentication middleware)
		userID, ok := c.Locals("userID").(uint)
		if !ok || userID == 0 {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}
		service.ProviderID = userID // Force set provider_id

		if err := db.Create(&service).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{
			"id":          service.ID,
			"name":        service.Name,
			"description": service.Description,
			"category":    service.Category,
			"price":       service.Price,
			"image_url":   service.ImageURL,
			"provider_id": service.ProviderID,
		})
	}
}

// GetServices returns all services with all fields (including provider_id)
func GetServices(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var services []models.Service
		if err := db.Find(&services).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(services)
	}
}

// FindService looks up a service by id
func FindService(db *gorm.DB, id int, service *models.Service) error {
	if id == 0 {
		return errors.New("ID must not be zero")
	}
	if err := db.First(service, "id = ?", id).Error; err != nil {
		return err
	}
	return nil
}

// GetService returns a single service by id
func GetService(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}

		var service models.Service
		if err := FindService(db, id, &service); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Service not found"})
			}
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(service)
	}
}

// UpdateService updates a service (only fields provided in the body)
func UpdateService(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}

		var service models.Service
		if err := db.First(&service, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Service not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}

		var updateData models.Service
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if err := db.Model(&service).Updates(updateData).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update service"})
		}

		return c.JSON(service)
	}
}

// DeleteService deletes a service by id
func DeleteService(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}

		var service models.Service
		if err := db.First(&service, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Service not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		if err := db.Delete(&service).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Service not found"})
		}
		return c.Status(200).SendString("Successfully Deleted")
	}
}
