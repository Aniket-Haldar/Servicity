package controllers

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/utils"
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
			return c.Status(500).JSON(fiber.Map{"error": "Error in Database"})
		}
		return c.JSON(msgs)
	}
}

func AdminListProviderRequests(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		status := c.Query("status")

		var providers []struct {
			ID               uint      `json:"id"`
			UserID           uint      `json:"user_id"`
			Profession       string    `json:"profession"`
			Pincode          string    `json:"pincode"`
			Pricing          float64   `json:"pricing"`
			AvailableTimings string    `json:"available_timings"`
			Status           string    `json:"status"`
			CreatedAt        time.Time `json:"created_at"`
			UserName         string    `json:"user_name"`
			UserEmail        string    `json:"user_email"`
			UserBlocked      bool      `json:"user_blocked"`
		}

		query := db.Table("provider_profiles").
			Select(`provider_profiles.id, provider_profiles.user_id, provider_profiles.profession, 
					provider_profiles.pincode, provider_profiles.pricing, provider_profiles.available_timings, 
					provider_profiles.status, provider_profiles.created_at,
					users.name as user_name, users.email as user_email, users.blocked as user_blocked`).
			Joins("JOIN users ON provider_profiles.user_id = users.id").
			Where("users.deleted_at IS NULL AND provider_profiles.deleted_at IS NULL")

		if status != "" {
			query = query.Where("provider_profiles.status = ?", status)
		}

		if err := query.Order("provider_profiles.created_at DESC").Find(&providers).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to fetch provider requests",
			})
		}

		return c.JSON(providers)
	}
}

func AdminUpdateProviderStatus(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		idStr := c.Params("id")
		providerID, err := strconv.ParseUint(idStr, 10, 64)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid provider ID",
			})
		}

		var req struct {
			Status string `json:"status"`
			Reason string `json:"reason,omitempty"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}

		if req.Status != "Approved" && req.Status != "Rejected" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Status must be 'Approved' or 'Rejected'",
			})
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			var provider models.ProviderProfile
			if err := tx.First(&provider, providerID).Error; err != nil {
				return err
			}

			var user models.User
			if err := tx.First(&user, provider.UserID).Error; err != nil {
				return err
			}

			if err := tx.Model(&provider).Update("status", req.Status).Error; err != nil {
				return err
			}

			go func() {
				if err := utils.SendProviderStatusEmail(user.Email, user.Name, req.Status, req.Reason); err != nil {
					fmt.Printf("Failed to send email to %s: %v\n", user.Email, err)
				}
			}()

			return nil
		})

		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
					"error": "Provider not found",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to update status",
			})
		}

		return c.JSON(fiber.Map{
			"status":  "success",
			"message": fmt.Sprintf("Provider %s successfully", strings.ToLower(req.Status)),
		})
	}
}
func AdminRequestHandler(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uint)
		if !ok {
			if idFloat, ok := c.Locals("userID").(float64); ok {
				userID = uint(idFloat)
			} else {
				return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
			}
		}

		var req struct {
			Message string `json:"message"`
		}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		// Prevent duplicate pending requests
		var existing models.AdminRequest
		db.Where("user_id = ? AND status = ?", userID, "Pending").First(&existing)
		if existing.ID != 0 {
			return c.Status(400).JSON(fiber.Map{"error": "You already have a pending admin request"})
		}

		adminReq := models.AdminRequest{
			UserID:  userID,
			Message: req.Message,
			Status:  "Pending",
		}
		if err := db.Create(&adminReq).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to submit request"})
		}

		return c.JSON(fiber.Map{"status": "request_submitted"})
	}
}

// 2. Superadmin views all pending requests
func AdminListAdminRequests(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		requesterID, ok := c.Locals("userID").(uint)
		if !ok {
			if idFloat, ok := c.Locals("userID").(float64); ok {
				requesterID = uint(idFloat)
			} else {
				return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
			}
		}
		var requester models.User
		if err := db.First(&requester, requesterID).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "User not found"})
		}
		// Only superadmin by email
		if requester.Email != "aniket.haldar05@gmail.com" {
			return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
		}

		var requests []models.AdminRequest
		if err := db.Where("status = ?", "Pending").Find(&requests).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch requests"})
		}
		return c.JSON(requests)
	}
}

// 3. Superadmin approves a request
func AdminApproveAdminRequest(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		requesterID, ok := c.Locals("userID").(uint)
		if !ok {
			if idFloat, ok := c.Locals("userID").(float64); ok {
				requesterID = uint(idFloat)
			} else {
				return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
			}
		}
		var requester models.User
		if err := db.First(&requester, requesterID).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "User not found"})
		}
		if requester.Email != "aniket.haldar05@gmail.com" {
			return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
		}

		reqID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request id"})
		}
		var adminReq models.AdminRequest
		if err := db.First(&adminReq, reqID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}
		if adminReq.Status != "Pending" {
			return c.Status(400).JSON(fiber.Map{"error": "Request already handled"})
		}

		// Make user admin
		var user models.User
		if err := db.First(&user, adminReq.UserID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		user.Role = "Admin"
		db.Save(&user)

		adminReq.Status = "Approved"
		db.Save(&adminReq)
		return c.JSON(fiber.Map{"status": "approved"})
	}
}

// 4. Superadmin rejects a request
func AdminRejectAdminRequest(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		requesterID, ok := c.Locals("userID").(uint)
		if !ok {
			if idFloat, ok := c.Locals("userID").(float64); ok {
				requesterID = uint(idFloat)
			} else {
				return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
			}
		}
		var requester models.User
		if err := db.First(&requester, requesterID).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "User not found"})
		}
		if requester.Email != "aniket.haldar05@gmail.com" {
			return c.Status(403).JSON(fiber.Map{"error": "Forbidden"})
		}

		reqID, err := strconv.ParseUint(c.Params("id"), 10, 64)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request id"})
		}
		var adminReq models.AdminRequest
		if err := db.First(&adminReq, reqID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}
		if adminReq.Status != "Pending" {
			return c.Status(400).JSON(fiber.Map{"error": "Request already handled"})
		}

		adminReq.Status = "Rejected"
		db.Save(&adminReq)
		return c.JSON(fiber.Map{"status": "rejected"})
	}
}
func GetMyAdminRequestStatus(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(uint)
		if !ok {
			if idFloat, ok := c.Locals("userID").(float64); ok {
				userID = uint(idFloat)
			} else {
				return c.Status(401).JSON(fiber.Map{"status": "unknown"})
			}
		}

		// Is user already admin?
		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(401).JSON(fiber.Map{"status": "unknown"})
		}
		if user.Role == "Admin" {
			return c.JSON(fiber.Map{"status": "Approved"})
		}

		// Is there an admin request?
		var req models.AdminRequest
		if err := db.Where("user_id = ?", userID).Order("created_at desc").First(&req).Error; err != nil {
			return c.JSON(fiber.Map{"status": "not_requested"})
		}

		return c.JSON(fiber.Map{"status": req.Status})
	}
}
