package models

import (
	"time"

	"gorm.io/gorm"
)

// Conversation represents a chat conversation between two users
type Conversation struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	CustomerID   uint           `json:"customer_id"`
	ProviderID   uint           `json:"provider_id"`
	BookingID    *uint          `json:"booking_id,omitempty"` // Optional booking reference
	LastMessage  string         `json:"last_message"`
	LastActivity time.Time      `json:"last_activity"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Customer User          `json:"customer" gorm:"foreignKey:CustomerID"`
	Provider User          `json:"provider" gorm:"foreignKey:ProviderID"`
	Booking  *Booking      `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
	Messages []ChatMessage `json:"messages,omitempty"`
}

// ChatMessage represents individual messages in a conversation
type ChatMessage struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	ConversationID uint           `json:"conversation_id"`
	SenderID       uint           `json:"sender_id"`
	Content        string         `json:"content"`
	MessageType    string         `json:"message_type" gorm:"default:'text'"` // text, image, file
	FileURL        string         `json:"file_url,omitempty"`
	FileName       string         `json:"file_name,omitempty"`
	Status         string         `json:"status" gorm:"default:'sent'"` // sent, delivered, read
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Conversation Conversation `json:"-" gorm:"foreignKey:ConversationID"`
	Sender       User         `json:"sender" gorm:"foreignKey:SenderID"`
}

// OnlineUser tracks user online status for real-time features
type OnlineUser struct {
	UserID    uint      `json:"user_id" gorm:"primaryKey"`
	LastSeen  time.Time `json:"last_seen"`
	IsOnline  bool      `json:"is_online" gorm:"default:false"`
	SocketID  string    `json:"socket_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID"`
}
