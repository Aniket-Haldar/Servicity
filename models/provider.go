package models

import (
	"gorm.io/gorm"
)

type ProviderProfile struct {
	gorm.Model
	UserID           uint
	Profession       string
	Pincode          string
	Pricing          float64
	AvailableTimings string
	Status           string `json:"status" gorm:"default:Pending"`
}
