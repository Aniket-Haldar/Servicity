# Build stage
FROM golang:1.24.3-alpine AS builder

WORKDIR /app

# Install git & certs
RUN apk --no-cache add git ca-certificates

# Copy go.mod and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN go build -o server .

# Final stage
# Final image
FROM alpine:latest

WORKDIR /app

# Install certs & mime types for correct Content-Type headers
RUN apk --no-cache add ca-certificates 

# Copy built server binary and frontend
COPY --from=builder /app/server .
COPY frontend ./frontend

# Expose port (Render uses $PORT env)
EXPOSE 8080

# Run the server
CMD ["./server"]