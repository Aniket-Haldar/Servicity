package main

import (
	"fmt"

	"github.com/Aniket-Haldar/Servicity/config"
)

func main() {
	db, err := config.DBConnect()
	if err != nil {
		fmt.Println("DB connection failed:", err)
		return
	}
	fmt.Println("DB connected:", db)
}
