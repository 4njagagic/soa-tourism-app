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
	blogs           storage.BlogRepository
	followerClient  *FollowerClient
}

func NewBlogService(blogs storage.BlogRepository) *BlogService {
	return &BlogService{blogs: blogs}
}

func NewBlogServiceWithFollowers(blogs storage.BlogRepository, followerClient *FollowerClient) *BlogService {
	return &BlogService{blogs: blogs, followerClient: followerClient}
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

func (s *BlogService) ListBlogsByFollowed(ctx context.Context, username string) ([]domain.Blog, error) {
	if s.followerClient == nil {
		return []domain.Blog{}, nil
	}

	followed, err := s.followerClient.GetFollowedUsers(username)
	if err != nil {
		// If follower service is unavailable, return empty list
		return []domain.Blog{}, nil
	}

	if len(followed) == 0 {
		return []domain.Blog{}, nil
	}

	// Get all blogs
	allBlogs, err := s.blogs.List(ctx)
	if err != nil {
		return nil, err
	}

	// Filter blogs by followed authors
	followedSet := make(map[string]bool)
	for _, u := range followed {
		followedSet[u] = true
	}

	filtered := make([]domain.Blog, 0)
	for _, blog := range allBlogs {
		if followedSet[blog.AuthorUsername] {
			filtered = append(filtered, blog)
		}
	}

	return filtered, nil
}

func (s *BlogService) DeleteBlog(ctx context.Context, id domain.BlogID) error {
	return s.blogs.Delete(ctx, id) 
    // Napomena: Implementiraj DeleteBlog u postgres/blog_repository.go (samo exec "DELETE FROM blogs WHERE id = $1")
}
