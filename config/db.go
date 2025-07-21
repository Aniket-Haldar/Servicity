package config

import (
	"fmt"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func DBConnect() (*gorm.DB, error) {
	dburl := os.Getenv("DB_URL")
	var db *gorm.DB
	var err error
	maxAttempts := 10
	for i := 0; i < maxAttempts; i++ {
		db, err = gorm.Open(postgres.Open(dburl), &gorm.Config{})
		if err == nil {
			return db, nil
		}
		fmt.Printf("Waiting for DB to be ready (%v), attempt %d/%d\n", err, i+1, maxAttempts)
		time.Sleep(2 * time.Second)
	}
	return nil, fmt.Errorf("DB connection failed after %d attempts: %v", maxAttempts, err)
}
