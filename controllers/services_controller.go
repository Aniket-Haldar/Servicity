package controllers

import (
	"errors"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func CreateService(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var Service models.Service
		if err := c.BodyParser(&Service); err != nil {
			return c.Status(400).JSON(err.Error())
		}
		if err := db.Create(&Service).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(Service)
	}
}
func GetServices(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		Services := []models.Service{}
		if err := db.Find(&Services).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(Services)
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

		return c.JSON(service)
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
		return c.Status(200).SendString("Succesfully Deleted")
	}
}
