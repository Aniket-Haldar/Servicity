package main

import (
	"fmt"
	"log"

	"github.com/Aniket-Haldar/Servicity/config"
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Failed to load .env")
	}

	config.SetupOAuthConfig()

	db, err := config.DBConnect()
	if err != nil {
		fmt.Println("DB connection failed:", err)
		return
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.ProviderProfile{},
		&models.CustomerProfile{},
		&models.Service{},
		&models.Booking{},
		&models.Review{},
	)
	if err != nil {
		fmt.Println("Migration error:", err)
		return
	}

	fmt.Println("Migration successful")
	app := fiber.New()

	routes.SetupRoutes(app, db)

	err = app.Listen(":3000")
	if err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
