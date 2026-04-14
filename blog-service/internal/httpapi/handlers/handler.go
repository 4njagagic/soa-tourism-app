package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"blog-service/internal/domain"
	"blog-service/internal/httpapi/dto"
	"blog-service/internal/httpapi/middleware"
	"blog-service/internal/service"

	"blog-service/internal/auth"

	"github.com/google/uuid"
)

type Handler struct {
	Blogs     *service.BlogService
	Comments  *service.CommentService
	Likes     *service.LikeService
	UploadDir string
	JWTSecret string
}

func New(blogs *service.BlogService, comments *service.CommentService, likes *service.LikeService, uploadDir string, jwtSecret string) *Handler {
	return &Handler{Blogs: blogs, Comments: comments, Likes: likes, UploadDir: uploadDir, JWTSecret: jwtSecret}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	_ = r
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (h *Handler) CreateBlog(w http.ResponseWriter, r *http.Request) {
	username, ok := middleware.UsernameFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Safety limit for uploads.
		r.Body = http.MaxBytesReader(w, r.Body, 25<<20) // 25MB
		if err := r.ParseMultipartForm(25 << 20); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid multipart form"})
			return
		}

		title := strings.TrimSpace(r.FormValue("title"))
		description := strings.TrimSpace(r.FormValue("description"))
		imageURLs, err := h.saveUploadedImages(r.MultipartForm)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}

		created, err := h.Blogs.CreateBlog(r.Context(), domain.Blog{
			Title:          title,
			DescriptionMD:  description,
			ImageURLs:      imageURLs,
			AuthorUsername: username,
		})
		if err != nil {
			writeServiceError(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, toBlogResponse(created, 0, nil))
		return
	}

	var req dto.CreateBlogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}

	created, err := h.Blogs.CreateBlog(r.Context(), domain.Blog{
		Title:          req.Title,
		DescriptionMD:  req.Description,
		ImageURLs:      req.ImageURLs,
		AuthorUsername: username,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, toBlogResponse(created, 0, nil))
}

func (h *Handler) saveUploadedImages(form *multipart.Form) ([]string, error) {
	if form == nil {
		return []string{}, nil
	}
	files := form.File["images"]
	if len(files) == 0 {
		return []string{}, nil
	}

	targetDir := filepath.Join(h.UploadDir, "blogs")
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return nil, errors.New("failed to prepare upload directory")
	}

	urls := make([]string, 0, len(files))
	for _, fh := range files {
		if fh == nil {
			continue
		}

		src, err := fh.Open()
		if err != nil {
			return nil, errors.New("failed to read uploaded file")
		}

		buf := make([]byte, 512)
		n, _ := io.ReadFull(src, buf)
		detected := http.DetectContentType(buf[:n])
		if !strings.HasPrefix(detected, "image/") {
			_ = src.Close()
			return nil, errors.New("only image uploads are supported")
		}

		ext := strings.ToLower(filepath.Ext(fh.Filename))
		if ext == "" {
			ext = extFromContentType(detected)
		}
		if ext == "" {
			ext = ".img"
		}

		name := uuid.NewString() + ext
		dstPath := filepath.Join(targetDir, name)
		dst, err := os.OpenFile(dstPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
		if err != nil {
			_ = src.Close()
			return nil, errors.New("failed to save uploaded file")
		}

		_, copyErr := io.Copy(dst, io.MultiReader(bytes.NewReader(buf[:n]), src))
		_ = dst.Close()
		_ = src.Close()
		if copyErr != nil {
			_ = os.Remove(dstPath)
			return nil, errors.New("failed to save uploaded file")
		}

		urls = append(urls, "/uploads/blogs/"+name)
	}

	return urls, nil
}

func extFromContentType(ct string) string {
	switch ct {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ""
	}
}

func (h *Handler) ListBlogs(w http.ResponseWriter, r *http.Request) {
	_ = r
	blogs, err := h.Blogs.ListBlogs(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
		return
	}

	out := make([]dto.BlogResponse, 0, len(blogs))
	for _, b := range blogs {
		likesCount, err := h.Likes.GetLikesCount(r.Context(), b.ID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
			return
		}
		out = append(out, toBlogResponse(b, likesCount, nil))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) GetBlog(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	blog, err := h.Blogs.GetBlog(r.Context(), domain.BlogID(id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
		return
	}

	likesCount, err := h.Likes.GetLikesCount(r.Context(), blog.ID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
		return
	}

	var userHasLiked *bool
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		if username, err := auth.UsernameFromAuthorizationHeader(authHeader, h.JWTSecret); err == nil {
			hasLiked, err := h.Likes.HasUserLiked(r.Context(), blog.ID, username)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
				return
			}
			userHasLiked = &hasLiked
		}
	}

	writeJSON(w, http.StatusOK, toBlogResponse(blog, likesCount, userHasLiked))
}

func (h *Handler) AddComment(w http.ResponseWriter, r *http.Request) {
	username, ok := middleware.UsernameFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	blogID := r.PathValue("id")
	var req dto.CreateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}

	created, err := h.Comments.AddComment(r.Context(), domain.Comment{
		BlogID:         domain.BlogID(blogID),
		Text:           req.Text,
		AuthorUsername: username,
		CreatedAt:      time.Time{},
		UpdatedAt:      time.Time{},
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, toCommentResponse(created))
}

func (h *Handler) ListComments(w http.ResponseWriter, r *http.Request) {
	blogID := r.PathValue("id")
	comments, err := h.Comments.ListComments(r.Context(), domain.BlogID(blogID))
	if err != nil {
		writeServiceError(w, err)
		return
	}

	out := make([]dto.CommentResponse, 0, len(comments))
	for _, c := range comments {
		out = append(out, toCommentResponse(c))
	}
	writeJSON(w, http.StatusOK, out)
}

func (h *Handler) UpdateComment(w http.ResponseWriter, r *http.Request) {
	username, ok := middleware.UsernameFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	id := r.PathValue("id")
	var req dto.UpdateCommentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}

	current, err := h.Comments.GetComment(r.Context(), domain.CommentID(id))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
		return
	}
	if current.AuthorUsername != username {
		writeJSON(w, http.StatusForbidden, map[string]any{"error": "forbidden"})
		return
	}

	updated, err := h.Comments.UpdateCommentText(r.Context(), domain.CommentID(id), req.Text)
	if err != nil {
		writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, toCommentResponse(updated))
}

func (h *Handler) LikeBlog(w http.ResponseWriter, r *http.Request) {
	username, ok := middleware.UsernameFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	blogID := r.PathValue("id")
	err := h.Likes.LikeBlog(r.Context(), domain.BlogID(blogID), username)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"message": "liked"})
}

func (h *Handler) UnlikeBlog(w http.ResponseWriter, r *http.Request) {
	username, ok := middleware.UsernameFromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
		return
	}

	blogID := r.PathValue("id")
	err := h.Likes.UnlikeBlog(r.Context(), domain.BlogID(blogID), username)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"message": "unliked"})
}

func writeServiceError(w http.ResponseWriter, err error) {
	if service.IsValidation(err) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
}

func toBlogResponse(b domain.Blog, likesCount int, userHasLiked *bool) dto.BlogResponse {
	return dto.BlogResponse{
		ID:             string(b.ID),
		Title:          b.Title,
		Description:    b.DescriptionMD,
		CreatedAt:      b.CreatedAt.Format(time.RFC3339),
		ImageURLs:      b.ImageURLs,
		AuthorUsername: b.AuthorUsername,
		LikesCount:     likesCount,
		UserHasLiked:   userHasLiked,
	}
}

func toCommentResponse(c domain.Comment) dto.CommentResponse {
	return dto.CommentResponse{
		ID:             string(c.ID),
		BlogID:         string(c.BlogID),
		Text:           c.Text,
		CreatedAt:      c.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      c.UpdatedAt.Format(time.RFC3339),
		AuthorUsername: c.AuthorUsername,
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
