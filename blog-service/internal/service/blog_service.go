package service

import (
	"context"
	"strings"
	"time"

	"blog-service/internal/domain"
	"blog-service/internal/storage"

	"github.com/google/uuid"
)

type BlogService struct {
	blogs storage.BlogRepository
}

func NewBlogService(blogs storage.BlogRepository) *BlogService {
	return &BlogService{blogs: blogs}
}

func (s *BlogService) CreateBlog(ctx context.Context, blog domain.Blog) (domain.Blog, error) {
	blog.Title = strings.TrimSpace(blog.Title)
	blog.DescriptionMD = strings.TrimSpace(blog.DescriptionMD)
	blog.AuthorUsername = strings.TrimSpace(blog.AuthorUsername)
	if blog.Title == "" {
		return domain.Blog{}, ErrValidation("title is required")
	}
	if blog.DescriptionMD == "" {
		return domain.Blog{}, ErrValidation("description is required")
	}
	if blog.AuthorUsername == "" {
		return domain.Blog{}, ErrValidation("author is required")
	}

	blog.ID = domain.BlogID(uuid.NewString())
	blog.CreatedAt = time.Now().UTC()
	if blog.ImageURLs == nil {
		blog.ImageURLs = []string{}
	}

	return s.blogs.Create(ctx, blog)
}

func (s *BlogService) GetBlog(ctx context.Context, id domain.BlogID) (domain.Blog, error) {
	return s.blogs.GetByID(ctx, id)
}

func (s *BlogService) ListBlogs(ctx context.Context) ([]domain.Blog, error) {
	return s.blogs.List(ctx)
}
