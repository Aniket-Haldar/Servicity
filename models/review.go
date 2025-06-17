package models

import (
	"gorm.io/gorm"
)

type Review struct {
	gorm.Model
	BookingID  uint
	ServiceID  uint
	CustomerID uint
	ProviderID uint
	Rating     int     `gorm:"check:rating >= 1 AND rating <= 5"`
	Comment    string  `gorm:"size:500"`
	Customer   User    `gorm:"foreignKey:CustomerID"`
	Provider   User    `gorm:"foreignKey:ProviderID"`
	Service    Service `gorm:"foreignKey:ServiceID"`
	Booking    Booking `gorm:"foreignKey:BookingID"`
}
