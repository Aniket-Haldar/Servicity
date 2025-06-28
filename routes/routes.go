package routes

import (
	"github.com/Aniket-Haldar/Servicity/controllers"
	"github.com/Aniket-Haldar/Servicity/middleware"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func SetupRoutes(app *fiber.App, db *gorm.DB) {

	profile := app.Group("/profile")
	profile.Post("/update", middleware.RequireAuth, controllers.UpdateProfile(db))
	profile.Get("/details", middleware.RequireAuth, controllers.GetProfile(db))
	profile.Put("/:id", middleware.RequireAuth, controllers.PutProfile(db))
	profile.Get("/:id", middleware.RequireAuth, controllers.GetUserByID(db))

	provider := app.Group("/provider")
	provider.Post("/messages", middleware.RequireAuth, controllers.ProviderSendMessage(db))
	provider.Get("/messages/sent", middleware.RequireAuth, controllers.GetProviderSentMessages(db))
	app.Get("/messages/provider", middleware.RequireAuth, controllers.GetProviderReceivedMessages(db))

	admin := app.Group("/admin")

	admin.Get("/users", middleware.RequireAuth, controllers.AdminListUsers(db))
	admin.Put("/users/:id/blocked", middleware.RequireAuth, controllers.AdminSetUserBlocked(db))
	admin.Get("/categories", middleware.RequireAuth, controllers.AdminListCategories(db))
	admin.Post("/categories", middleware.RequireAuth, controllers.AdminAddCategory(db))
	admin.Delete("/categories/:category", middleware.RequireAuth, controllers.AdminRemoveCategory(db))
	admin.Get("/analytics", middleware.RequireAuth, controllers.AdminAnalytics(db))
	admin.Post("/messages", middleware.RequireAuth, controllers.AdminSendMessage(db))
	admin.Get("/messages/sent", middleware.RequireAuth, controllers.GetAdminSentMessages(db))

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
	review.Get("/service", controllers.GetServiceReviews(db))
	review.Get("/:id", controllers.GetReview(db))
	review.Put("/:id", controllers.UpdateReview(db))
	review.Delete("/:id", controllers.DeleteReview(db))

	app.Get("/messages/received", middleware.RequireAuth, controllers.GetUserMessages(db))

	auth := app.Group("/auth")
	auth.Get("/google/login", controllers.GoogleLogin)
	auth.Get("/google/callback", func(c *fiber.Ctx) error {
		return controllers.GoogleCallback(db, c)
	})

}
