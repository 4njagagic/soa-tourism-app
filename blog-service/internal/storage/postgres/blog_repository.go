package postgres

import (
	"context"
	"encoding/json"

	"blog-service/internal/domain"
)

type BlogRepository struct {
	db *DB
}

func NewBlogRepository(db *DB) *BlogRepository {
	return &BlogRepository{db: db}
}

func (r *BlogRepository) Create(ctx context.Context, blog domain.Blog) (domain.Blog, error) {
	imagesJSON, err := json.Marshal(blog.ImageURLs)
	if err != nil {
		return domain.Blog{}, err
	}

	_, err = r.db.SQL.ExecContext(ctx,
		`INSERT INTO blogs (id, title, description_md, created_at, image_urls, author_username)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		string(blog.ID), blog.Title, blog.DescriptionMD, blog.CreatedAt, imagesJSON, blog.AuthorUsername,
	)
	if err != nil {
		return domain.Blog{}, err
	}
	return blog, nil
}

func (r *BlogRepository) GetByID(ctx context.Context, id domain.BlogID) (domain.Blog, error) {
	var blog domain.Blog
	var imagesRaw []byte
	if err := r.db.SQL.QueryRowContext(ctx,
		`SELECT id, title, description_md, created_at, image_urls, author_username
		 FROM blogs WHERE id = $1`,
		string(id),
	).Scan(&blog.ID, &blog.Title, &blog.DescriptionMD, &blog.CreatedAt, &imagesRaw, &blog.AuthorUsername); err != nil {
		return domain.Blog{}, err
	}
	_ = json.Unmarshal(imagesRaw, &blog.ImageURLs)
	return blog, nil
}

func (r *BlogRepository) List(ctx context.Context) ([]domain.Blog, error) {
	rows, err := r.db.SQL.QueryContext(ctx,
		`SELECT id, title, description_md, created_at, image_urls, author_username
		 FROM blogs ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.Blog
	for rows.Next() {
		var blog domain.Blog
		var imagesRaw []byte
		if err := rows.Scan(&blog.ID, &blog.Title, &blog.DescriptionMD, &blog.CreatedAt, &imagesRaw, &blog.AuthorUsername); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(imagesRaw, &blog.ImageURLs)
		out = append(out, blog)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
