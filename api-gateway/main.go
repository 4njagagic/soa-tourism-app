package main

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func getEnv(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func proxyTo(target string) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("invalid proxy target %s: %v", target, err)
	}
	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		// preserve host header of backend
		req.Host = targetURL.Host
	}
	return proxy
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", getEnv("CORS_ALLOW_ORIGIN", "*"))
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	// service targets - prefer explicit full URLs, otherwise build from service name + port
	blog := getEnv("BLOG_SERVICE_URL", "http://blog-service:"+getEnv("BLOG_SERVICE_PORT", "8081"))
	tour := getEnv("TOUR_SERVICE_URL", "http://tour-service:"+getEnv("TOUR_SERVICE_PORT", "8083"))
	stakeholders := getEnv("STAKEHOLDERS_SERVICE_URL", "http://stakeholders-service:"+getEnv("STAKEHOLDERS_SERVICE_PORT", "8080"))
	frontend := getEnv("FRONTEND_URL", "http://frontend:"+getEnv("FRONTEND_CONTAINER_PORT", "80"))
	addr := getEnv("GATEWAY_ADDRESS", ":8000")

	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Blog service: uploads and /api/blogs
	mux.Handle("/uploads/", proxyTo(blog))
	mux.Handle("/api/blogs", proxyTo(blog))
	mux.Handle("/api/blogs/", proxyTo(blog))

	// Tour service
	mux.Handle("/api/tours", proxyTo(tour))
	mux.Handle("/api/tours/", proxyTo(tour))

	// Stakeholders service (users, auth)
	mux.Handle("/api/stakeholders", proxyTo(stakeholders))
	mux.Handle("/api/stakeholders/", proxyTo(stakeholders))
	mux.Handle("/api/auth", proxyTo(stakeholders))
	mux.Handle("/api/auth/", proxyTo(stakeholders))
	mux.Handle("/api/users", proxyTo(stakeholders))
	mux.Handle("/api/users/", proxyTo(stakeholders))

	// Fallback: static frontend (serve SPA)
	mux.Handle("/", proxyTo(frontend))

	handler := loggingMiddleware(corsMiddleware(mux))

	srv := &http.Server{
		Addr:    addr,
		Handler: handler,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("gateway listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("gateway server error: %v", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("error shutting down: %v", err)
	}
}
