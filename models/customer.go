package models

import (
	"gorm.io/gorm"
)

type CustomerProfile struct {
	gorm.Model
	UserID  uint
	Address string
	History string
}
