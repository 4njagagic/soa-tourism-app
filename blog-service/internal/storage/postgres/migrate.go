package postgres

import (
	"context"
)

func Migrate(ctx context.Context, db *DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS blogs (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			description_md TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL,
			image_urls JSONB NOT NULL DEFAULT '[]',
			author_username TEXT NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_blogs_created_at ON blogs(created_at DESC);`,
		`CREATE TABLE IF NOT EXISTS comments (
			id TEXT PRIMARY KEY,
			blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
			text TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL,
			author_username TEXT NOT NULL
		);`,
		`CREATE INDEX IF NOT EXISTS idx_comments_blog_created_at ON comments(blog_id, created_at ASC);`,
	}

	for _, stmt := range stmts {
		if _, err := db.SQL.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}
