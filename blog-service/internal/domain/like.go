package domain

import "time"

type LikeID string

type Like struct {
	ID            LikeID
	BlogID        BlogID
	UserUsername  string
	CreatedAt     time.Time
}