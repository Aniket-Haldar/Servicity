package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type EmailConfig struct {
	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	AppName      string
	AppURL       string
}

func LoadEmailConfig() EmailConfig {
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Error loading .env file for email config: %v", err)
	}

	emailConfig := EmailConfig{
		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     os.Getenv("SMTP_PORT"),
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASS"),
		AppName:      os.Getenv("APP_NAME"),
		AppURL:       os.Getenv("APP_URL"),
	}

	if emailConfig.AppName == "" {
		emailConfig.AppName = "Servicity"
	}
	if emailConfig.AppURL == "" {
		emailConfig.AppURL = "http://localhost:5500"
	}

	return emailConfig
}
