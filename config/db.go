package config

import (
	"fmt"
	"log"

	"github.com/Aniket-Haldar/Servicity/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func DBConnect() (*gorm.DB, error) {
	Configg := config.LoadDBConfig()
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s",
		Configg.Host, Configg.Port, Configg.User, Configg.Password, Configg.Database)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
		return db, err
	}
	return db, nil
}
