package models

import (
	"gorm.io/gorm"
)

type Review struct {
	gorm.Model
	CustomerID uint
	ProviderID uint
	Rating     int
	Comment    string
}
