package models

import (
	"gorm.io/gorm"
)

type ProviderMessage struct {
	gorm.Model
	ID         uint `gorm:"primaryKey"`
	SenderID   uint
	ReceiverID uint
	BookingID  *uint
	Title      string
	Content    string
	Booking    Booking `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
}
