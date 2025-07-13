package models

import (
	"gorm.io/gorm"
)

type Notification struct {
	gorm.Model
	UserID  uint   `json:"user_id"` // recipient user
	Message string `json:"message"`
	Read    bool   `json:"read"`
}
