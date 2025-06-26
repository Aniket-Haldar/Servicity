package controllers

import (
	"strconv"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func AdminListUsers(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := c.Query("role")
		var users []models.User
		query := db
		if role != "" {
			query = query.Where("role = ?", role)
		}
		if err := query.Find(&users).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch users"})
		}
		return c.JSON(users)
	}
}

// Block/unblock user
func AdminSetUserBlocked(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idStr := c.Params("id")
		userID, _ := strconv.ParseUint(idStr, 10, 64)
		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		var req struct{ Blocked bool }
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid body"})
		}
		user.Blocked = req.Blocked
		db.Save(&user)
		return c.JSON(user)
	}
}

func AdminListCategories(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var categories []string
		if err := db.Model(&models.Service{}).Distinct("category").Pluck("category", &categories).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch categories"})
		}
		return c.JSON(categories)
	}
}

func AdminRemoveCategory(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		cat := c.Params("category")
		if cat == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Category required"})
		}
		if err := db.Where("category = ?", cat).Delete(&models.Service{}).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete category"})
		}
		return c.JSON(fiber.Map{"status": "success"})
	}
}

func AdminAddCategory(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			Category string `json:"category"`
		}
		if err := c.BodyParser(&req); err != nil || req.Category == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Category required"})
		}

		return c.JSON(fiber.Map{"status": "added", "category": req.Category})
	}
}

func AdminAnalytics(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {

		type ServiceStat struct {
			Name  string `json:"name"`
			Count int64  `json:"count"`
		}
		var popular []ServiceStat
		db.Raw(`SELECT s.name, COUNT(b.id) as count
				FROM services s
				JOIN bookings b ON s.id = b.service_id
				GROUP BY s.name
				ORDER BY count DESC
				LIMIT 5`).Scan(&popular)

		type ProviderStat struct {
			Name   string  `json:"name"`
			Rating float64 `json:"rating"`
		}
		var topProviders []ProviderStat
		db.Raw(`SELECT u.name, AVG(r.rating) as rating
				FROM users u
				JOIN services s ON u.id = s.provider_id
				JOIN reviews r ON s.id = r.service_id
				WHERE u.role = 'Provider'
				GROUP BY u.name
				ORDER BY rating DESC
				LIMIT 5`).Scan(&topProviders)

		return c.JSON(fiber.Map{
			"popular_services": popular,
			"top_providers":    topProviders,
		})
	}
}

func AdminSendMessage(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var req struct {
			TargetRole string `json:"target_role"`
			Content    string `json:"content"`
		}
		if err := c.BodyParser(&req); err != nil || req.Content == "" || req.TargetRole == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Content and target_role are required"})
		}
		adminID, _ := c.Locals("userID").(uint)
		msg := models.Message{
			TargetRole: req.TargetRole,
			Content:    req.Content,
			AdminID:    adminID,
		}
		if err := db.Create(&msg).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save message"})
		}
		return c.JSON(fiber.Map{
			"status": "sent",
			"to":     req.TargetRole,
			"id":     msg.ID,
		})
	}
}

func GetUserMessages(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uint)
		if !ok {
			idFloat, ok := c.Locals("userID").(float64)
			if !ok {
				return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
			}
			userID = uint(idFloat)
		}
		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "User not found"})
		}

		userRole := user.Role

		var msgs []models.Message
		if err := db.
			Where("target_role = ? OR target_role = ?", "All", userRole).
			Order("created_at desc").
			Find(&msgs).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "DB error"})
		}
		return c.JSON(msgs)
	}
}

func GetAdminSentMessages(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		adminID, ok := c.Locals("userID").(uint)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
		}
		var msgs []models.Message
		if err := db.
			Where("admin_id = ?", adminID).
			Order("created_at desc").
			Find(&msgs).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "DB error"})
		}
		return c.JSON(msgs)
	}
}
