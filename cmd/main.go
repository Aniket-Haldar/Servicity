package main

import (
	"fmt"
	"os"

	"github.com/Valgard/godotenv"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func (r *Repository) SetupRoutes(app *fiber.App)

type Repository struct {
	DB *gorm.DB
}

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		fmt.Println("Error loading .env file:", err)
		return
	}

	r := Repository{
		DB: db,
	}

	app := fiber.New()
	r.SetupRoutes(app)
	app.Listen(os.Getenv("PORT"))
}
