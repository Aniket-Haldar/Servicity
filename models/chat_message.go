package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

type ChatMessage struct {
	gorm.Model
	ID          uint       `gorm:"primaryKey" json:"id"`
	SenderID    uint       `json:"sender_id"`
	ReceiverID  uint       `json:"receiver_id"`
	RoomID      string     `json:"room_id" gorm:"index"`
	Content     string     `json:"content"`
	MessageType string     `json:"message_type" gorm:"default:'text'"`
	IsRead      bool       `json:"is_read" gorm:"default:false"`
	ReadAt      *time.Time `json:"read_at,omitempty"`
	BookingID   *uint      `json:"booking_id,omitempty"`

	Sender   User    `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver User    `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
	Booking  Booking `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
}

type ChatRoom struct {
	gorm.Model
	ID            string     `gorm:"primaryKey" json:"id"`
	CustomerID    uint       `json:"customer_id"`
	ProviderID    uint       `json:"provider_id"`
	BookingID     *uint      `json:"booking_id,omitempty"`
	Status        string     `json:"status" gorm:"default:'active'"`
	LastMessageAt *time.Time `json:"last_message_at"`

	Customer User          `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Provider User          `gorm:"foreignKey:ProviderID" json:"provider,omitempty"`
	Booking  Booking       `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
	Messages []ChatMessage `gorm:"foreignKey:RoomID;references:ID" json:"messages,omitempty"`
}

func GenerateRoomID(customerID, providerID uint) string {
	if customerID < providerID {
		return fmt.Sprintf("room_%d_%d", customerID, providerID)
	}
	return fmt.Sprintf("room_%d_%d", providerID, customerID)
}
