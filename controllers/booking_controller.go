package controllers

import (
	"errors"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// post method for booking
func CreateBooking(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var Booking models.Booking
		if err := c.BodyParser(&Booking); err != nil {
			return c.Status(400).JSON(err.Error())
		}
		if err := db.Create(&Booking).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(Booking)
	}
}

// get method for booking
func GetBookings(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		Bookings := []models.Booking{}
		if err := db.Find(&Bookings).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(Bookings)
	}
}

// function to find id
func FindBooking(db *gorm.DB, id int, booking *models.Booking) error {
	if id == 0 {
		return errors.New("ID must not be zero")
	}
	if err := db.First(booking, "id = ?", id).Error; err != nil {
		return err
	}
	return nil
}

// to find by specific id
func GetBooking(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}

		var booking models.Booking
		if err := FindBooking(db, id, &booking); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "booking not found"})
			}
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(booking)
	}
}

// update by PUT method
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

		if err := db.Model(&booking).Updates(updateData).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update Booking"})
		}

		return c.JSON(booking)
	}
}

// delete by DELETE method
func DeleteBooking(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {

		id, err := c.ParamsInt("id")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "ID must be an integer"})
		}

		var booking models.Booking
		if err := db.First(&booking, id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(404).JSON(fiber.Map{"error": "booking not found"})
			}
			return c.Status(500).JSON(fiber.Map{"error": "Database error"})
		}
		if err := db.Delete(&booking).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "booking not found"})
		}
		return c.Status(200).SendString("Succesfully Deleted")
	}
}
