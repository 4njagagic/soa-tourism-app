package service

import (
	"context"
	"strings"
	"time"

	"blog-service/internal/domain"
	"blog-service/internal/storage"

	"github.com/google/uuid"
)

type CommentService struct {
	comments storage.CommentRepository
}

func NewCommentService(comments storage.CommentRepository) *CommentService {
	return &CommentService{comments: comments}
}

func (s *CommentService) GetComment(ctx context.Context, id domain.CommentID) (domain.Comment, error) {
	if strings.TrimSpace(string(id)) == "" {
		return domain.Comment{}, ErrValidation("id is required")
	}
	return s.comments.GetByID(ctx, id)
}

func (s *CommentService) AddComment(ctx context.Context, c domain.Comment) (domain.Comment, error) {
	c.Text = strings.TrimSpace(c.Text)
	c.AuthorUsername = strings.TrimSpace(c.AuthorUsername)
	if strings.TrimSpace(string(c.BlogID)) == "" {
		return domain.Comment{}, ErrValidation("blogId is required")
	}
	if c.Text == "" {
		return domain.Comment{}, ErrValidation("text is required")
	}
	if c.AuthorUsername == "" {
		return domain.Comment{}, ErrValidation("author is required")
	}

	now := time.Now().UTC()
	c.ID = domain.CommentID(uuid.NewString())
	c.CreatedAt = now
	c.UpdatedAt = now

	return s.comments.Add(ctx, c)
}

func (s *CommentService) ListComments(ctx context.Context, blogID domain.BlogID) ([]domain.Comment, error) {
	if strings.TrimSpace(string(blogID)) == "" {
		return nil, ErrValidation("blogId is required")
	}
	return s.comments.ListByBlogID(ctx, blogID)
}

func (s *CommentService) UpdateCommentText(ctx context.Context, id domain.CommentID, newText string) (domain.Comment, error) {
	newText = strings.TrimSpace(newText)
	if strings.TrimSpace(string(id)) == "" {
		return domain.Comment{}, ErrValidation("id is required")
	}
	if newText == "" {
		return domain.Comment{}, ErrValidation("text is required")
	}
	return s.comments.UpdateText(ctx, id, newText)
}
