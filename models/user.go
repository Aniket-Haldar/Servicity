package models

import (
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Name     string `json:"Name"`
	Email    string `gorm:"unique" json:"Email"`
	Password string `json:"password"`
	Role     string `gorm:"not null" json:"role"`

	ProviderProfile ProviderProfile `gorm:"foreignKey:UserID"`
	CustomerProfile CustomerProfile `gorm:"foreignKey:UserID"`
}
