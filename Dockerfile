# --- Build Stage ---
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Install git for private/public Go modules
RUN apk add --no-cache git

# Copy and download Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy whole project
COPY . .

# Build (assumes main.go is in cmd/)
RUN go build -o server ./cmd/main.go

# --- Final Image ---
FROM alpine:3.19
WORKDIR /app

RUN apk add --no-cache ca-certificates

# Copy built Go binary
COPY --from=builder /app/server /app/server

# Copy .env file
COPY .env .env

# Copy frontend assets
COPY frontend /app/frontends
EXPOSE 3000

CMD ["/app/server"]