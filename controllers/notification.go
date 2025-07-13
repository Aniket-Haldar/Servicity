package controllers

import (
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func GetNotifications(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}
		var notifications []models.Notification
		if err := db.Where("user_id = ?", userID).Order("created_at DESC").Find(&notifications).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch notifications"})
		}
		return c.JSON(notifications)
	}
}

func MarkNotificationRead(db *gorm.DB) fiber.Handler {
	type Req struct {
		ID uint `json:"id"`
	}
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}
		var req Req
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}
		var notif models.Notification
		if err := db.First(&notif, "id = ? AND user_id = ?", req.ID, userID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Notification not found"})
		}
		notif.Read = true
		if err := db.Save(&notif).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update notification"})
		}
		return c.JSON(fiber.Map{"status": "success"})
	}
}
