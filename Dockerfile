FROM golang:1.24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o server ./cmd/main.go

FROM alpine:3.19
WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/server /app/server

COPY frontend /app/frontend

EXPOSE 3000

CMD ["/app/server"]