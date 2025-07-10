package models

import (
	"gorm.io/gorm"
)

type AdminRequest struct {
	gorm.Model
	UserID  uint   `json:"user_id"`
	Message string `json:"message"`
	Status  string `json:"status"`
}
