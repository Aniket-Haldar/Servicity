package models

import (
	"time"

	"gorm.io/gorm"
)

type Booking struct {
	gorm.Model
	CustomerID   uint      `json:"customer_id"`
	ProviderID   uint      `json:"provider_id"`
	ServiceID    uint      `json:"service_id"`
	Service      Service   `gorm:"foreignKey:ServiceID"`
	BookingTime  time.Time `json:"booking_time"`
	Status       string    `json:"status"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	Address      string    `json:"address"`
	SpecialNotes string    `json:"special_notes"`
}
