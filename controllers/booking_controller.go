package controllers

import (
	"errors"
	"time"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// POST /booking
func CreateBooking(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var booking models.Booking
		if err := c.BodyParser(&booking); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		var service models.Service
		if err := db.First(&service, booking.ServiceID).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid service ID"})
		}
		booking.ProviderID = service.ProviderID
		if booking.BookingTime.IsZero() {
			booking.BookingTime = time.Now()
		}
		if booking.Status == "" {
			booking.Status = "pending"
		}
		if err := db.Create(&booking).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}

		// Provider notification: someone placed an order
		db.Create(&models.Notification{
			UserID:  booking.ProviderID,
			Message: "You have a new booking order!",
		})

		return c.JSON(booking)
	}
}

// customer , provider
func GetBookings(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}
		var bookings []models.Booking
		if err := db.Where("customer_id = ?", userID).Find(&bookings).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(bookings)
	}
}
func GetProviderBookings(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}
		var bookings []models.Booking
		if err := db.Preload("Service").
			Where("provider_id = ?", userID).
			Find(&bookings).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(bookings)
	}
}

// particular id
func GetBooking(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}
		var booking models.Booking
		if err := db.First(&booking, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Booking not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		return c.JSON(booking)
	}
}

// update (provider or customer)
func UpdateBooking(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}
		var booking models.Booking
		if err := db.First(&booking, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Booking not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		var updateData models.Booking
		if err := c.BodyParser(&updateData); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		// Save previous status to detect change
		prevStatus := booking.Status

		if err := db.Model(&booking).Updates(updateData).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update booking"})
		}

		// Customer notification: booking accepted or rejected
		if updateData.Status != "" && updateData.Status != prevStatus {
			if updateData.Status == "accepted" {
				db.Create(&models.Notification{
					UserID:  booking.CustomerID,
					Message: "Your booking has been accepted!",
				})
			} else if updateData.Status == "rejected" {
				db.Create(&models.Notification{
					UserID:  booking.CustomerID,
					Message: "Your booking has been rejected.",
				})
			}
		}

		return c.JSON(booking)
	}
}

// delete (only for provider or admin)
func DeleteBooking(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}
		var booking models.Booking
		if err := db.First(&booking, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "Booking not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		if err := db.Delete(&booking).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete booking"})
		}
		return c.JSON(fiber.Map{"message": "Successfully deleted"})
	}
}
