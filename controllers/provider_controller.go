package controllers

import (
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func ProviderSendMessage(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			ReceiverID uint   `json:"receiver_id"`
			BookingID  *uint  `json:"booking_id"`
			Title      string `json:"title"`
			Content    string `json:"content"`
		}
		if err := c.BodyParser(&req); err != nil || req.Content == "" || req.ReceiverID == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "Content and receiver_id required"})
		}
		providerID, _ := c.Locals("userID").(uint)
		msg := models.ProviderMessage{
			SenderID:   providerID,
			ReceiverID: req.ReceiverID,
			BookingID:  req.BookingID,
			Title:      req.Title,
			Content:    req.Content,
		}
		if err := db.Create(&msg).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save message"})
		}
		return c.JSON(fiber.Map{
			"status": "sent",
			"to":     req.ReceiverID,
			"id":     msg.ID,
		})
	}
}

func GetProviderSentMessages(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		providerID, _ := c.Locals("userID").(uint)
		var msgs []models.ProviderMessage
		if err := db.
			Where("sender_id = ?", providerID).
			Order("created_at desc").
			Find(&msgs).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		return c.JSON(msgs)
	}
}

func GetProviderReceivedMessages(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		customerID, _ := c.Locals("userID").(uint)
		var msgs []models.ProviderMessage
		if err := db.
			Where("receiver_id = ?", customerID).
			Preload("Booking.Service").
			Order("created_at desc").
			Find(&msgs).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		return c.JSON(msgs)
	}
}
