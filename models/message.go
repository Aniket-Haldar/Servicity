package models

import (
	"gorm.io/gorm"
)

type Message struct {
	gorm.Model
	TargetRole string `json:"target_role"`
	Content    string
	AdminID    uint
}
