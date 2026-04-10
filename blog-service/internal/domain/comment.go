package domain

import "time"

type CommentID string

type Comment struct {
	ID             CommentID
	BlogID         BlogID
	Text           string
	CreatedAt      time.Time
	UpdatedAt      time.Time
	AuthorUsername string
}
