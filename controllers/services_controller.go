package controllers

import (
	"errors"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func CreateService(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var service models.Service
		if err := c.BodyParser(&service); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		if err := db.Create(&service).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{
			"id":          service.ID,
			"name":        service.Name,
			"description": service.Description,
			"category":    service.Category,
		})
	}
}

func GetServices(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var services []models.Service
		if err := db.Find(&services).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}

		// Create response without fields that might not exist
		var response []fiber.Map
		for _, s := range services {
			item := fiber.Map{
				"id":          s.ID,
				"name":        s.Name,
				"description": s.Description,
				"category":    s.Category,
			}
			// Only add price if it exists in model
			if s.Price != 0 {
				item["price"] = s.Price
			}
			// Only add image_url if it exists in model
			if s.ImageURL != "" {
				item["image_url"] = s.ImageURL
			}
			response = append(response, item)
		}
		return c.JSON(response)
	}
}

func FindService(db *gorm.DB, id int, service *models.Service) error {
	if id == 0 {
		return errors.New("ID must not be zero")
	}
	if err := db.First(service, "id = ?", id).Error; err != nil {
		return err
	}
	return nil
}

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

		response := fiber.Map{
			"id":          service.ID,
			"name":        service.Name,
			"description": service.Description,
			"category":    service.Category,
		}
		if service.Price != 0 {
			response["price"] = service.Price
		}
		if service.ImageURL != "" {
			response["image_url"] = service.ImageURL
		}
		return c.JSON(response)
	}
}

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
