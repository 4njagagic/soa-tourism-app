package domain

import "time"

type BlogID string

type Blog struct {
	ID             BlogID
	Title          string
	DescriptionMD  string
	CreatedAt      time.Time
	ImageURLs      []string
	AuthorUsername string
}
