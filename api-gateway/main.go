package main

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
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

type jsonRPCRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
	ID      int         `json:"id"`
}

type jsonRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *jsonRPCError   `json:"error,omitempty"`
	ID      int             `json:"id"`
}

type jsonRPCError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func jsonRPCCall(ctx context.Context, url, method string, params interface{}, authorization string) (*json.RawMessage, *jsonRPCError, error) {
	payload := jsonRPCRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
		ID:      1,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url+"/rpc", bytes.NewReader(body))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	var rpcResp jsonRPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, nil, err
	}

	if rpcResp.Error != nil {
		return nil, rpcResp.Error, nil
	}

	return &rpcResp.Result, nil, nil
}

func handleTourRPC(target string, proxy http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/tours/")
		if r.Method == http.MethodPost && strings.HasSuffix(path, "/publish") {
			tourID := strings.TrimSuffix(path, "/publish")
			tourID = strings.TrimSuffix(tourID, "/")
			if tourID == "" {
				proxy.ServeHTTP(w, r)
				return
			}

			result, rpcErr, err := jsonRPCCall(r.Context(), target, "PublishTour", map[string]interface{}{"id": tourID}, r.Header.Get("Authorization"))
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadGateway)
				return
			}
			if rpcErr != nil {
				status := rpcErr.Code
				if status < 100 || status >= 600 {
					status = http.StatusBadRequest
				}
				http.Error(w, rpcErr.Message, status)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write(*result)
			return
		}

		if r.Method == http.MethodPost && strings.HasSuffix(path, "/archive") {
			tourID := strings.TrimSuffix(path, "/archive")
			tourID = strings.TrimSuffix(tourID, "/")
			if tourID == "" {
				proxy.ServeHTTP(w, r)
				return
			}

			result, rpcErr, err := jsonRPCCall(r.Context(), target, "ArchiveTour", map[string]interface{}{"id": tourID}, r.Header.Get("Authorization"))
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadGateway)
				return
			}
			if rpcErr != nil {
				status := rpcErr.Code
				if status < 100 || status >= 600 {
					status = http.StatusBadRequest
				}
				http.Error(w, rpcErr.Message, status)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			w.Write(*result)
			return
		}

		proxy.ServeHTTP(w, r)
	}
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
	follower := getEnv("FOLLOWER_SERVICE_URL", "http://follower-service:"+getEnv("FOLLOWER_SERVICE_PORT", "8082"))
	frontend := getEnv("FRONTEND_URL", "http://frontend:"+getEnv("FRONTEND_CONTAINER_PORT", "80"))
	addr := getEnv("GATEWAY_ADDRESS", ":8000")

	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Blog service: uploads and /api/blogs
	mux.Handle("/blog-api/uploads/", http.StripPrefix("/blog-api", proxyTo(blog)))
	mux.Handle("/uploads/", proxyTo(blog))
	mux.Handle("/api/blogs", proxyTo(blog))
	mux.Handle("/api/blogs/", proxyTo(blog))

	// Tour service
	mux.Handle("/tour-api/uploads/", http.StripPrefix("/tour-api", proxyTo(tour)))
	tourProxy := proxyTo(tour)
	mux.Handle("/api/tours", handleTourRPC(tour, tourProxy))
	mux.Handle("/api/tours/", handleTourRPC(tour, tourProxy))
	mux.Handle("/api/user-positions", tourProxy)
	mux.Handle("/api/user-positions/", tourProxy)

	// Stakeholders service (users, auth)
	mux.Handle("/api/stakeholders", proxyTo(stakeholders))
	mux.Handle("/api/stakeholders/", proxyTo(stakeholders))
	mux.Handle("/api/auth", proxyTo(stakeholders))
	mux.Handle("/api/auth/", proxyTo(stakeholders))
	mux.Handle("/api/users", proxyTo(stakeholders))
	mux.Handle("/api/users/", proxyTo(stakeholders))

	// Followers service
	mux.Handle("/followers", proxyTo(follower))
	mux.Handle("/followers/", proxyTo(follower))

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
