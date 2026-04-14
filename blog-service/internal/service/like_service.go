package service

import (
	"context"

	"blog-service/internal/domain"
	"blog-service/internal/storage"
)

type LikeService struct {
	likes storage.LikeRepository
}

func NewLikeService(likes storage.LikeRepository) *LikeService {
	return &LikeService{likes: likes}
}

func (s *LikeService) LikeBlog(ctx context.Context, blogID domain.BlogID, userUsername string) error {
	return s.likes.AddLike(ctx, blogID, userUsername)
}

func (s *LikeService) UnlikeBlog(ctx context.Context, blogID domain.BlogID, userUsername string) error {
	return s.likes.RemoveLike(ctx, blogID, userUsername)
}

func (s *LikeService) HasUserLiked(ctx context.Context, blogID domain.BlogID, userUsername string) (bool, error) {
	return s.likes.HasLike(ctx, blogID, userUsername)
}

func (s *LikeService) GetLikesCount(ctx context.Context, blogID domain.BlogID) (int, error) {
	return s.likes.CountLikes(ctx, blogID)
}