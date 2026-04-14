package httpapi

import (
	"net/http"

	"blog-service/internal/config"
	"blog-service/internal/httpapi/handlers"
	"blog-service/internal/httpapi/middleware"
)

func NewRouter(cfg config.Config, h *handlers.Handler) http.Handler {

	mux := http.NewServeMux()

	// Public uploads (images, etc.)
	// NOTE: This is served as-is from UploadDir. Keep it public for simple image embeds.
	fileServer := http.FileServer(http.Dir(cfg.UploadDir))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fileServer))

	mux.HandleFunc("GET /api/health", h.Health)

	// Blogs
	mux.HandleFunc("POST /api/blogs", middleware.RequireAuth(cfg, h.CreateBlog))
	mux.HandleFunc("GET /api/blogs", h.ListBlogs)
	mux.HandleFunc("GET /api/blogs/{id}", h.GetBlog)

	// Likes
	mux.HandleFunc("POST /api/blogs/{id}/like", middleware.RequireAuth(cfg, h.LikeBlog))
	mux.HandleFunc("DELETE /api/blogs/{id}/like", middleware.RequireAuth(cfg, h.UnlikeBlog))

	// Comments
	mux.HandleFunc("POST /api/blogs/{id}/comments", middleware.RequireAuth(cfg, h.AddComment))
	mux.HandleFunc("GET /api/blogs/{id}/comments", h.ListComments)
	mux.HandleFunc("PUT /api/comments/{id}", middleware.RequireAuth(cfg, h.UpdateComment))

	return middleware.CORS(cfg.CORSAllowOrigin, mux)
}
