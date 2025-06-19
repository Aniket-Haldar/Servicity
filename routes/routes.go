package routes

import (
	"github.com/Aniket-Haldar/Servicity/controllers"
	"github.com/Aniket-Haldar/Servicity/middleware"
	"github.com/Aniket-Haldar/Servicity/utils"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB) {

	profile := app.Group("/profile")
	profile.Post("/update", middleware.RequireAuth, controllers.UpdateProfile(db))
	profile.Get("/details", middleware.RequireAuth, controllers.GetProfile(db))
	profile.Put("/:id", middleware.RequireAuth, controllers.PutProfile(db))
	profile.Get("/:id", middleware.RequireAuth, controllers.GetUserByID(db))

	service := app.Group("/services")

	service.Post("/", middleware.RequireAuth, controllers.CreateService(db))
	service.Get("/", controllers.GetServices(db))
	service.Get("/:id", controllers.GetService(db))
	service.Put("/:id", controllers.UpdateService(db))
	service.Delete("/:id", controllers.DeleteService(db))
	dashboard := app.Group("/dashboard")
	dashboard.Get("/", middleware.RequireAuth, controllers.DashboardController(db))

	booking := app.Group("/booking")
	booking.Post("/", controllers.CreateBooking(db))
	booking.Get("/", middleware.RequireAuth, controllers.GetBookings(db))
	booking.Get("/provider", middleware.RequireAuth, controllers.GetProviderBookings(db))
	booking.Get("/:id", middleware.RequireAuth, controllers.GetBooking(db))
	booking.Put("/:id", controllers.UpdateBooking(db))
	booking.Delete("/:id", controllers.DeleteBooking(db))

	review := app.Group("/reviews")
	review.Post("/", controllers.CreateReview(db))

	review.Get("/", controllers.GetReviewByBookingAndCustomer(db))
	review.Get("/provider", controllers.GetProviderReviews(db))
	review.Get("/all", controllers.GetAllReviews(db))
	review.Get("/:id", controllers.GetReview(db))
	review.Put("/:id", controllers.UpdateReview(db))
	review.Delete("/:id", controllers.DeleteReview(db))

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
