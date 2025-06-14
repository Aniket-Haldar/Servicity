package models

import "gorm.io/gorm"

type Service struct {
	gorm.Model
	Name        string
	Description string
	Price       float64
	Category    string
	ImageURL    string `json:"image_url"`
	ProviderID  uint   `json:"provider_id"`
}
