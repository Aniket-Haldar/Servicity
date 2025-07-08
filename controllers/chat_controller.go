package controllers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/Aniket-Haldar/Servicity/websocket"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type ChatController struct {
	DB  *gorm.DB
	Hub *websocket.Hub
}

func NewChatController(db *gorm.DB, hub *websocket.Hub) *ChatController {
	return &ChatController{
		DB:  db,
		Hub: hub,
	}
}

func (cc *ChatController) GetOrCreateRoom(c *fiber.Ctx) error {
	var req struct {
		CustomerID uint  `json:"customer_id"`
		ProviderID uint  `json:"provider_id"`
		BookingID  *uint `json:"booking_id,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.CustomerID == 0 || req.ProviderID == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Both customer_id and provider_id are required"})
	}

	roomID := models.GenerateRoomID(req.CustomerID, req.ProviderID)

	var room models.ChatRoom
	err := cc.DB.Where("id = ?", roomID).First(&room).Error

	if err == gorm.ErrRecordNotFound {
		room = models.ChatRoom{
			ID:         roomID,
			CustomerID: req.CustomerID,
			ProviderID: req.ProviderID,
			BookingID:  req.BookingID,
			Status:     "active",
		}
		if err := cc.DB.Create(&room).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create room"})
		}
	} else if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch room"})
	}

	if err := cc.DB.Preload("Customer").Preload("Provider").Preload("Booking").
		First(&room, "id = ?", roomID).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to load room details"})
	}

	return c.JSON(room)
}

func (cc *ChatController) GetMessages(c *fiber.Ctx) error {
	roomID := c.Params("roomId")
	if roomID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Room ID is required"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page <= 0 {
		page = 1
	}
	limit := 50
	offset := (page - 1) * limit

	var messages []models.ChatMessage
	if err := cc.DB.Where("room_id = ?", roomID).
		Preload("Sender").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch messages"})
	}

	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return c.JSON(messages)
}

func (cc *ChatController) SendMessage(c *fiber.Ctx) error {
	roomID := c.Params("roomId")
	if roomID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Room ID is required"})
	}

	var req struct {
		SenderID   uint   `json:"sender_id"`
		ReceiverID uint   `json:"receiver_id"`
		Content    string `json:"content"`
		BookingID  *uint  `json:"booking_id,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.SenderID == 0 || req.ReceiverID == 0 || req.Content == "" {
		return c.Status(400).JSON(fiber.Map{"error": "sender_id, receiver_id, and content are required"})
	}

	message := models.ChatMessage{
		SenderID:   req.SenderID,
		ReceiverID: req.ReceiverID,
		RoomID:     roomID,
		Content:    req.Content,
		BookingID:  req.BookingID,
	}

	if err := cc.DB.Create(&message).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save message"})
	}

	cc.DB.Model(&models.ChatRoom{}).Where("id = ?", roomID).
		Update("last_message_at", time.Now())

	cc.DB.Preload("Sender").First(&message, message.ID)

	if cc.Hub != nil {
		wsMsg := map[string]interface{}{
			"type":      "new_message",
			"room_id":   roomID,
			"message":   message,
			"sender_id": req.SenderID,
		}
		if msgBytes, err := json.Marshal(wsMsg); err == nil {
			cc.Hub.BroadcastMessage(msgBytes)
		}
	}

	return c.JSON(message)
}

func (cc *ChatController) GetUserRooms(c *fiber.Ctx) error {
	userIDStr := c.Query("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		fmt.Println("Error parsing user_id:", err)
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user_id"})
	}
	var rooms []models.ChatRoom
	result := cc.DB.Where("customer_id = ? OR provider_id = ?", userID, userID).
		Preload("Customer").
		Preload("Provider").
		Order("last_message_at DESC").
		Find(&rooms)
	fmt.Println(result)
	return c.JSON(rooms)

}

func (cc *ChatController) MarkAsRead(c *fiber.Ctx) error {
	roomID := c.Params("roomId")
	userIDRaw := c.Query("user_id")

	if roomID == "" || userIDRaw == "" {
		return c.SendStatus(400)
	}
	userID, err := strconv.ParseUint(userIDRaw, 10, 32)
	if err != nil {
		return c.SendStatus(400)
	}

	now := time.Now()
	cc.DB.Model(&models.ChatMessage{}).
		Where("room_id = ? AND receiver_id = ? AND is_read = false", roomID, userID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": &now,
		})

	return c.SendStatus(200)
}
