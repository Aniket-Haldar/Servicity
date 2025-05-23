package main

import (
	"fmt"
	"log"

	"github.com/Aniket-Haldar/Servicity/config"
	"github.com/Aniket-Haldar/Servicity/middleware"
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	config.SetupOAuthConfig()
	// Connect to DB
	db, err := config.DBConnect()
	if err != nil {
		log.Fatal("DB connection failed: ", err)
	}
	fmt.Println("DB connected!")

	if err := db.AutoMigrate(
		&models.User{},
		&models.ProviderProfile{},
		&models.CustomerProfile{},
		&models.Service{},
		&models.Booking{},
		&models.Review{},
	); err != nil {
		log.Fatal("AutoMigrate failed: ", err)
	}

	app := fiber.New()

	routes.SetupRoutes(app, db)

	app.Get("/secure", middleware.RequireAuth, func(c *fiber.Ctx) error {
		email := c.Locals("userEmail").(string)
		return c.JSON(fiber.Map{
			"message": "You are authenticated!",
			"email":   email,
		})
	})

	log.Fatal(app.Listen(":3000"))
}
