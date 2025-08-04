package websocket

import (
	"encoding/json"
	"log"
	"strconv"
	"time"

	"github.com/Aniket-Haldar/Servicity/models"
	"github.com/gofiber/websocket/v2"
	"gorm.io/gorm"
)

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	db         *gorm.DB
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID uint
	roomID string
}

type WSMessage struct {
	Type     string      `json:"type"`
	RoomID   string      `json:"room_id"`
	Content  string      `json:"content"`
	SenderID uint        `json:"sender_id"`
	Data     interface{} `json:"data,omitempty"`
}

func NewHub(db *gorm.DB) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		db:         db,
	}
}

func (h *Hub) GetBroadcast() chan []byte {
	return h.broadcast
}

func (h *Hub) BroadcastMessage(message []byte) {
	select {
	case h.broadcast <- message:
	default:
		log.Println("Broadcast channel is full, message dropped")
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Client registered: User %d in room %s", client.userID, client.roomID)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client unregistered: User %d", client.userID)
			}

		case message := <-h.broadcast:
			var wsMsg WSMessage
			if err := json.Unmarshal(message, &wsMsg); err != nil {
				log.Printf("Error unmarshaling WebSocket message: %v", err)
				continue
			}

			for client := range h.clients {
				if client.roomID == wsMsg.RoomID {
					select {
					case client.send <- message:
					default:
						close(client.send)
						delete(h.clients, client)
						log.Printf("Client send channel full, removing client: User %d", client.userID)
					}
				}
			}
		}
	}
}

func (h *Hub) HandleWebSocket(c *websocket.Conn) {

	userIDStr := c.Query("user_id")
	roomID := c.Query("room_id")

	if userIDStr == "" || roomID == "" {
		log.Println("Missing user_id or room_id in WebSocket connection")
		c.Close()
		return
	}

	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		log.Printf("Invalid user_id: %v", err)
		c.Close()
		return
	}

	client := &Client{
		hub:    h,
		conn:   c,
		send:   make(chan []byte, 256),
		userID: uint(userID),
		roomID: roomID, // Serve frontend files
	}

	client.hub.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var wsMsg WSMessage
		err := c.conn.ReadJSON(&wsMsg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		wsMsg.SenderID = c.userID
		wsMsg.RoomID = c.roomID

		if err := c.saveMessage(&wsMsg); err != nil {
			log.Printf("Error saving message: %v", err)
			continue
		}

		msgBytes, err := json.Marshal(wsMsg)
		if err != nil {
			log.Printf("Error marshaling message: %v", err)
			continue
		}

		c.hub.broadcast <- msgBytes
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Error writing message: %v", err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) saveMessage(wsMsg *WSMessage) error {

	if wsMsg.Type != "chat_message" || wsMsg.Content == "" {
		return nil
	}

	message := models.ChatMessage{
		SenderID: wsMsg.SenderID,

		RoomID:  wsMsg.RoomID,
		Content: wsMsg.Content,

		IsRead: false,
	}

	result := c.hub.db.Create(&message)
	if result.Error != nil {
		return result.Error
	}

	c.hub.db.Model(&models.ChatRoom{}).Where("id = ?", wsMsg.RoomID).
		Update("last_message_at", time.Now())

	return nil
}
