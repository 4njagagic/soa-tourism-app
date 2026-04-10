package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"blog-service/internal/domain"
	"blog-service/internal/httpapi/dto"
	"blog-service/internal/httpapi/middleware"
	"blog-service/internal/service"
)

type Handler struct {
	Blogs    *service.BlogService
	Comments *service.CommentService
}

func New(blogs *service.BlogService, comments *service.CommentService) *Handler {
	return &Handler{Blogs: blogs, Comments: comments}
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

	writeJSON(w, http.StatusCreated, toBlogResponse(created))
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
		out = append(out, toBlogResponse(b))
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
	writeJSON(w, http.StatusOK, toBlogResponse(blog))
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

func writeServiceError(w http.ResponseWriter, err error) {
	if service.IsValidation(err) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "internal error"})
}

func toBlogResponse(b domain.Blog) dto.BlogResponse {
	return dto.BlogResponse{
		ID:             string(b.ID),
		Title:          b.Title,
		Description:    b.DescriptionMD,
		CreatedAt:      b.CreatedAt.Format(time.RFC3339),
		ImageURLs:      b.ImageURLs,
		AuthorUsername: b.AuthorUsername,
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
