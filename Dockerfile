# --- Stage 1: Build the Go binary ---
FROM golang:1.24.3-alpine AS builder

WORKDIR /app

RUN apk --no-cache add git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

WORKDIR /app/cmd
RUN go build -o /app/server .


FROM alpine:latest

WORKDIR /app
RUN apk --no-cache add ca-certificates

COPY --from=builder /app/server .
COPY frontend ./frontend

EXPOSE 3000
CMD ["./server"]
