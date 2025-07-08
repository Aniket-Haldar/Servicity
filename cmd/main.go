package main

import (
	"fmt"
	"log"

	"github.com/Aniket-Haldar/Servicity/config"
	"github.com/Aniket-Haldar/Servicity/middleware"
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
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
		&models.Message{},
		&models.ProviderMessage{},
		&models.ChatRoom{},
		&models.ChatMessage{},
	); err != nil {
		log.Fatal("AutoMigrate failed: ", err)
	}
	middleware.SetDatabase(db)

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://127.0.0.1:5500, http://localhost:3000, http://localhost:5500",
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))

	routes.SetupRoutes(app, db)
	log.Fatal(app.Listen(":3000"))
}
