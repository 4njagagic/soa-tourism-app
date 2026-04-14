package storage

import (
	"context"

	"blog-service/internal/domain"
)

type BlogRepository interface {
	Create(ctx context.Context, blog domain.Blog) (domain.Blog, error)
	GetByID(ctx context.Context, id domain.BlogID) (domain.Blog, error)
	List(ctx context.Context) ([]domain.Blog, error)
}

type CommentRepository interface {
	Add(ctx context.Context, comment domain.Comment) (domain.Comment, error)
	GetByID(ctx context.Context, id domain.CommentID) (domain.Comment, error)
	ListByBlogID(ctx context.Context, blogID domain.BlogID) ([]domain.Comment, error)
	UpdateText(ctx context.Context, id domain.CommentID, newText string) (domain.Comment, error)
}

type LikeRepository interface {
	AddLike(ctx context.Context, blogID domain.BlogID, userUsername string) error
	RemoveLike(ctx context.Context, blogID domain.BlogID, userUsername string) error
	HasLike(ctx context.Context, blogID domain.BlogID, userUsername string) (bool, error)
	CountLikes(ctx context.Context, blogID domain.BlogID) (int, error)
}
