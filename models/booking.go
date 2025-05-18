package models

import (
	"time"

	"gorm.io/gorm"
)

type Booking struct {
	gorm.Model
	CustomerID  uint
	ProviderID  uint
	ServiceID   uint
	BookingTime time.Time
	Status      string
}
