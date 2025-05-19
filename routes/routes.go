package routes

import (
	"github.com/Aniket-Haldar/Servicity/controllers"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB) {
	auth := app.Group("/auth")
	auth.Get("/google/login", controllers.GoogleLogin)
	auth.Get("/google/callback", func(c *fiber.Ctx) error {
		return controllers.GoogleCallback(db, c) // Inject DB
	})
}
