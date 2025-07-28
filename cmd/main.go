package main

import (
	"fmt"
	"log"
	"os"

	"github.com/Aniket-Haldar/Servicity/config"
	"github.com/Aniket-Haldar/Servicity/middleware"
	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {

	port := os.Getenv("PORT")
	if port == "" {
		log.Println("Warning: PORT not set, defaulting to 3000")
		port = "3000"
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
		&models.AdminRequest{},
		&models.Notification{},
	); err != nil {
		log.Fatal("AutoMigrate failed: ", err)
	}
	middleware.SetDatabase(db)

	app := fiber.New()

	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://127.0.0.1:5500, http://localhost:3000, http://localhost:5500,http://127.0.0.1:300,https://servicity.onrender.com ",
		AllowMethods:     "GET,POST,HEAD,PUT,DELETE,PATCH",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
	}))
	app.Static("/frontend", "./frontend")
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/html/index.html")
	})
	routes.SetupRoutes(app, db)
	log.Fatal(app.Listen(":3000"))
}
