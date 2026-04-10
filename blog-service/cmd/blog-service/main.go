package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"blog-service/internal/config"
	"blog-service/internal/httpapi"
	"blog-service/internal/httpapi/handlers"
	"blog-service/internal/service"
	"blog-service/internal/storage/postgres"
)

func main() {
	cfg := config.FromEnv()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	db, err := postgres.Connect(ctx, cfg.DSN())
	if err != nil {
		log.Fatalf("db connect error: %v", err)
	}
	defer func() { _ = db.SQL.Close() }()

	if err := postgres.Migrate(ctx, db); err != nil {
		log.Fatalf("db migrate error: %v", err)
	}

	blogRepo := postgres.NewBlogRepository(db)
	commentRepo := postgres.NewCommentRepository(db)

	blogSvc := service.NewBlogService(blogRepo)
	commentSvc := service.NewCommentService(commentRepo)

	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		log.Fatalf("upload dir init error (%s): %v", filepath.Clean(cfg.UploadDir), err)
	}

	handler := handlers.New(blogSvc, commentSvc, cfg.UploadDir)

	h := httpapi.NewRouter(cfg, handler)
	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           h,
		ReadHeaderTimeout: 10 * time.Second,
	}

	shutdownCh := make(chan os.Signal, 1)
	signal.Notify(shutdownCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-shutdownCh
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(ctx)
	}()

	log.Printf("blog-service listening on %s", cfg.Addr())
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
