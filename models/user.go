package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Name  string `json:"name"`
	Email string `gorm:"unique" json:"email"`
	Role  string `gorm:"not null" json:"role"`

	ProviderProfile ProviderProfile `gorm:"foreignKey:UserID"`
	CustomerProfile CustomerProfile `gorm:"foreignKey:UserID"`
}
