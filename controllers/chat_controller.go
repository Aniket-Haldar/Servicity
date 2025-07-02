package controllers

import (
	"strconv"
	"time"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/websocket"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// GetOrCreateConversation creates or gets existing conversation between users
func GetOrCreateConversation(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("userID").(uint)
		otherUserIDStr := c.Params("userID")
		otherUserID, err := strconv.ParseUint(otherUserIDStr, 10, 64)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
		}

		// Determine customer and provider
		var user, otherUser models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}
		if err := db.First(&otherUser, uint(otherUserID)).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Other user not found"})
		}

		var customerID, providerID uint
		if user.Role == "Customer" {
			customerID = userID
			providerID = uint(otherUserID)
		} else {
			customerID = uint(otherUserID)
			providerID = userID
		}

		// Find or create conversation
		var conversation models.Conversation
		result := db.Where("customer_id = ? AND provider_id = ?", customerID, providerID).First(&conversation)

		if result.Error == gorm.ErrRecordNotFound {
			conversation = models.Conversation{
				CustomerID:   customerID,
				ProviderID:   providerID,
				LastActivity: time.Now(),
			}
			if err := db.Create(&conversation).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to create conversation"})
			}
		}

		// Load conversation with user details
		if err := db.Preload("Customer").Preload("Provider").First(&conversation, conversation.ID).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to load conversation"})
		}

		return c.JSON(conversation)
	}
}

// GetUserConversations gets all conversations for a user
func GetUserConversations(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("userID").(uint)

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found"})
		}

		var conversations []models.Conversation
		query := db.Preload("Customer").Preload("Provider")

		if user.Role == "Customer" {
			query = query.Where("customer_id = ?", userID)
		} else {
			query = query.Where("provider_id = ?", userID)
		}

		if err := query.Order("last_activity DESC").Find(&conversations).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch conversations"})
		}

		// Add online status for each conversation partner
		for i := range conversations {
			var partnerID uint
			if user.Role == "Customer" {
				partnerID = conversations[i].ProviderID
			} else {
				partnerID = conversations[i].CustomerID
			}

			// Check if partner is online
			isOnline := websocket.ChatHub.IsUserOnline(partnerID)
			if user.Role == "Customer" {
				conversations[i].Provider.Blocked = isOnline // Reusing blocked field for online status
			} else {
				conversations[i].Customer.Blocked = isOnline
			}
		}

		return c.JSON(conversations)
	}
}

// SendMessage sends a message in a conversation
func SendMessage(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("userID").(uint)
		convIDStr := c.Params("conversationID")
		convID, err := strconv.ParseUint(convIDStr, 10, 64)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid conversation ID"})
		}

		var req struct {
			Content     string `json:"content"`
			MessageType string `json:"message_type"`
			FileURL     string `json:"file_url,omitempty"`
			FileName    string `json:"file_name,omitempty"`
		}

		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
		}

		if req.Content == "" && req.FileURL == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Message content or file required"})
		}

		// Verify user is part of this conversation
		var conversation models.Conversation
		if err := db.First(&conversation, uint(convID)).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Conversation not found"})
		}

		if conversation.CustomerID != userID && conversation.ProviderID != userID {
			return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
		}

		// Create message
		message := models.ChatMessage{
			ConversationID: uint(convID),
			SenderID:       userID,
			Content:        req.Content,
			MessageType:    req.MessageType,
			FileURL:        req.FileURL,
			FileName:       req.FileName,
			Status:         "sent",
		}

		if err := db.Create(&message).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save message"})
		}

		// Update conversation last activity and message
		db.Model(&conversation).Updates(map[string]interface{}{
			"last_activity": time.Now(),
			"last_message":  req.Content,
		})

		// Load sender info
		db.Preload("Sender").First(&message, message.ID)

		// Send real-time notification to other user
		var recipientID uint
		if conversation.CustomerID == userID {
			recipientID = conversation.ProviderID
		} else {
			recipientID = conversation.CustomerID
		}

		websocket.ChatHub.SendToUser(recipientID, websocket.Message{
			Type:   "new_message",
			Data:   message,
			ConvID: uint(convID),
		})

		return c.JSON(message)
	}
}

// GetMessages gets messages for a conversation with pagination
func GetMessages(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("userID").(uint)
		convIDStr := c.Params("conversationID")
		convID, err := strconv.ParseUint(convIDStr, 10, 64)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid conversation ID"})
		}

		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "50"))
		offset := (page - 1) * limit

		// Verify user is part of this conversation
		var conversation models.Conversation
		if err := db.First(&conversation, uint(convID)).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Conversation not found"})
		}

		if conversation.CustomerID != userID && conversation.ProviderID != userID {
			return c.Status(403).JSON(fiber.Map{"error": "Access denied"})
		}

		var messages []models.ChatMessage
		if err := db.Where("conversation_id = ?", convID).
			Preload("Sender").
			Order("created_at DESC").
			Limit(limit).
			Offset(offset).
			Find(&messages).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch messages"})
		}

		// Mark messages as read
		go func() {
			db.Model(&models.ChatMessage{}).
				Where("conversation_id = ? AND sender_id != ? AND status != 'read'", convID, userID).
				Update("status", "read")
		}()

		return c.JSON(messages)
	}
}

// MarkMessagesRead marks messages as read
func MarkMessagesRead(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("userID").(uint)
		convIDStr := c.Params("conversationID")
		convID, err := strconv.ParseUint(convIDStr, 10, 64)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid conversation ID"})
		}

		// Update message status
		result := db.Model(&models.ChatMessage{}).
			Where("conversation_id = ? AND sender_id != ? AND status != 'read'", convID, userID).
			Update("status", "read")

		if result.Error != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to mark messages as read"})
		}

		return c.JSON(fiber.Map{
			"status":  "success",
			"updated": result.RowsAffected,
		})
	}
}
