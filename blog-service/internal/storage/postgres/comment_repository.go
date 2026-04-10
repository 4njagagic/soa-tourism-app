package postgres

import (
	"context"

	"blog-service/internal/domain"
)

type CommentRepository struct {
	db *DB
}

func NewCommentRepository(db *DB) *CommentRepository {
	return &CommentRepository{db: db}
}

func (r *CommentRepository) GetByID(ctx context.Context, id domain.CommentID) (domain.Comment, error) {
	var c domain.Comment
	if err := r.db.SQL.QueryRowContext(ctx,
		`SELECT id, blog_id, text, created_at, updated_at, author_username
		 FROM comments WHERE id = $1`,
		string(id),
	).Scan(&c.ID, &c.BlogID, &c.Text, &c.CreatedAt, &c.UpdatedAt, &c.AuthorUsername); err != nil {
		return domain.Comment{}, err
	}
	return c, nil
}

func (r *CommentRepository) Add(ctx context.Context, comment domain.Comment) (domain.Comment, error) {
	_, err := r.db.SQL.ExecContext(ctx,
		`INSERT INTO comments (id, blog_id, text, created_at, updated_at, author_username)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		string(comment.ID), string(comment.BlogID), comment.Text, comment.CreatedAt, comment.UpdatedAt, comment.AuthorUsername,
	)
	if err != nil {
		return domain.Comment{}, err
	}
	return comment, nil
}

func (r *CommentRepository) ListByBlogID(ctx context.Context, blogID domain.BlogID) ([]domain.Comment, error) {
	rows, err := r.db.SQL.QueryContext(ctx,
		`SELECT id, blog_id, text, created_at, updated_at, author_username
		 FROM comments WHERE blog_id = $1 ORDER BY created_at ASC`,
		string(blogID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Comment
	for rows.Next() {
		var c domain.Comment
		if err := rows.Scan(&c.ID, &c.BlogID, &c.Text, &c.CreatedAt, &c.UpdatedAt, &c.AuthorUsername); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *CommentRepository) UpdateText(ctx context.Context, id domain.CommentID, newText string) (domain.Comment, error) {
	var c domain.Comment
	if err := r.db.SQL.QueryRowContext(ctx,
		`UPDATE comments
		 SET text = $2, updated_at = NOW()
		 WHERE id = $1
		 RETURNING id, blog_id, text, created_at, updated_at, author_username`,
		string(id), newText,
	).Scan(&c.ID, &c.BlogID, &c.Text, &c.CreatedAt, &c.UpdatedAt, &c.AuthorUsername); err != nil {
		return domain.Comment{}, err
	}
	return c, nil
}
