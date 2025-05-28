package routes

import (
	"github.com/Aniket-Haldar/Servicity/controllers"
	"github.com/Aniket-Haldar/Servicity/utils"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB) {
	service := app.Group("/services")

	service.Post("/", controllers.CreateService(db))
	service.Get("/", controllers.GetServices(db))
	service.Get("/:id", controllers.GetService(db))
	service.Put("/:id", controllers.UpdateService(db))
	service.Delete("/:id", controllers.DeleteService(db))
	auth := app.Group("/auth")
	auth.Get("/google/login", controllers.GoogleLogin)
	auth.Get("/google/callback", func(c *fiber.Ctx) error {
		return controllers.GoogleCallback(db, c)
	})

	app.Get("/profile", func(c *fiber.Ctx) error {

		token := c.Get("Authorization")
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing token"})
		}

		email, err := utils.ParseJWT(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		return c.JSON(fiber.Map{
			"message": "Authenticated request",
			"email":   email,
		})
	})
}
