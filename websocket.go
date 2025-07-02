package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

type Hub struct {
	clients    map[uint]*Client
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

type Client struct {
	userID uint
	conn   *websocket.Conn
	send   chan []byte
}

type Message struct {
	Type   string      `json:"type"`
	Data   interface{} `json:"data"`
	UserID uint        `json:"user_id,omitempty"`
	ConvID uint        `json:"conversation_id,omitempty"`
}

var ChatHub = &Hub{
	clients:    make(map[uint]*Client),
	broadcast:  make(chan []byte),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client.userID] = client
			h.mutex.Unlock()
			log.Printf("User %d connected", client.userID)

			// Send online status to other users
			h.broadcastUserStatus(client.userID, true)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client.userID]; ok {
				delete(h.clients, client.userID)
				close(client.send)
			}
			h.mutex.Unlock()
			log.Printf("User %d disconnected", client.userID)

			// Send offline status to other users
			h.broadcastUserStatus(client.userID, false)

		case message := <-h.broadcast:
			h.mutex.RLock()
			for userID, client := range h.clients {
				select {
				case client.send <- message:
				default:
					delete(h.clients, userID)
					close(client.send)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *Hub) SendToUser(userID uint, message Message) {
	h.mutex.RLock()
	client, exists := h.clients[userID]
	h.mutex.RUnlock()

	if exists {
		msgBytes, _ := json.Marshal(message)
		select {
		case client.send <- msgBytes:
		default:
			h.mutex.Lock()
			delete(h.clients, userID)
			close(client.send)
			h.mutex.Unlock()
		}
	}
}

func (h *Hub) broadcastUserStatus(userID uint, online bool) {
	msg := Message{
		Type: "user_status",
		Data: map[string]interface{}{
			"user_id": userID,
			"online":  online,
		},
	}
	msgBytes, _ := json.Marshal(msg)
	h.broadcast <- msgBytes
}

func (h *Hub) IsUserOnline(userID uint) bool {
	h.mutex.RLock()
	_, exists := h.clients[userID]
	h.mutex.RUnlock()
	return exists
}

func (c *Client) readPump() {
	defer func() {
		ChatHub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) writePump() {
	defer c.conn.Close()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.conn.WriteMessage(websocket.TextMessage, message)
		}
	}
}

func HandleWebSocket(userID uint) fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		client := &Client{
			userID: userID,
			conn:   c,
			send:   make(chan []byte, 256),
		}

		ChatHub.register <- client

		go client.writePump()
		client.readPump()
	})
}
