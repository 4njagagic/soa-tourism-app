package postgres

import (
	"context"

	"blog-service/internal/domain"
	"github.com/google/uuid"
)

type LikeRepository struct {
	db *DB
}

func NewLikeRepository(db *DB) *LikeRepository {
	return &LikeRepository{db: db}
}

func (r *LikeRepository) AddLike(ctx context.Context, blogID domain.BlogID, userUsername string) error {
	id := uuid.NewString()
	_, err := r.db.SQL.ExecContext(ctx,
		`INSERT INTO likes (id, blog_id, user_username) VALUES ($1, $2, $3)
		 ON CONFLICT (blog_id, user_username) DO NOTHING`,
		id, string(blogID), userUsername,
	)
	return err
}

func (r *LikeRepository) RemoveLike(ctx context.Context, blogID domain.BlogID, userUsername string) error {
	_, err := r.db.SQL.ExecContext(ctx,
		`DELETE FROM likes WHERE blog_id = $1 AND user_username = $2`,
		string(blogID), userUsername,
	)
	return err
}

func (r *LikeRepository) HasLike(ctx context.Context, blogID domain.BlogID, userUsername string) (bool, error) {
	var exists bool
	err := r.db.SQL.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM likes WHERE blog_id = $1 AND user_username = $2)`,
		string(blogID), userUsername,
	).Scan(&exists)
	return exists, err
}

func (r *LikeRepository) CountLikes(ctx context.Context, blogID domain.BlogID) (int, error) {
	var count int
	err := r.db.SQL.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM likes WHERE blog_id = $1`,
		string(blogID),
	).Scan(&count)
	return count, err
}