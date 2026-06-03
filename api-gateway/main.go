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

func handlePurchaseGRPC(gateway *purchaseGrpcGateway, proxy http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		gateway.handlePurchase(w, r, proxy)
	}
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

func handleTourExecutionRPC(target string, proxy http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/tour-executions")

		if r.Method == http.MethodPost && path == "/start" {
			var body struct {
				TourID   string  `json:"tourId"`
				Latitude float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TourID == "" {
				http.Error(w, "Invalid request body: tourId is required", http.StatusBadRequest)
				return
			}

			result, rpcErr, err := jsonRPCCall(r.Context(), target, "StartTourExecution", map[string]interface{}{
				"tourId":    body.TourID,
				"latitude":  body.Latitude,
				"longitude": body.Longitude,
			}, r.Header.Get("Authorization"))
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

		if r.Method == http.MethodGet && path != "" {
			executionID := strings.TrimPrefix(path, "/")
			if executionID == "" {
				proxy.ServeHTTP(w, r)
				return
			}

			result, rpcErr, err := jsonRPCCall(r.Context(), target, "GetTourExecution", map[string]interface{}{"id": executionID}, r.Header.Get("Authorization"))
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

		if r.Method == http.MethodPost && strings.HasSuffix(path, "/check-nearby-key-point") {
			executionID := strings.TrimSuffix(path, "/check-nearby-key-point")
			executionID = strings.TrimPrefix(executionID, "/")
			if executionID == "" {
				proxy.ServeHTTP(w, r)
				return
			}

			var body struct {
				Latitude  float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}

			result, rpcErr, err := jsonRPCCall(r.Context(), target, "CheckNearbyKeyPoint", map[string]interface{}{
				"executionId": executionID,
				"latitude":    body.Latitude,
				"longitude":   body.Longitude,
			}, r.Header.Get("Authorization"))
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

		if r.Method == http.MethodPost && strings.HasSuffix(path, "/complete") {
			executionID := strings.TrimSuffix(path, "/complete")
			executionID = strings.TrimPrefix(executionID, "/")
			if executionID == "" {
				proxy.ServeHTTP(w, r)
				return
			}

			var body struct {
				Latitude  float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
				Force     bool    `json:"force"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}

			params := map[string]interface{}{
				"executionId": executionID,
				"latitude":    body.Latitude,
				"longitude":   body.Longitude,
			}
			if body.Force {
				params["force"] = true
			}

			result, rpcErr, err := jsonRPCCall(r.Context(), target, "CompleteTourExecution", params, r.Header.Get("Authorization"))
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

		if r.Method == http.MethodPost && strings.HasSuffix(path, "/abandon") {
			executionID := strings.TrimSuffix(path, "/abandon")
			executionID = strings.TrimPrefix(executionID, "/")
			if executionID == "" {
				proxy.ServeHTTP(w, r)
				return
			}

			var body struct {
				Latitude  float64 `json:"latitude"`
				Longitude float64 `json:"longitude"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid request body", http.StatusBadRequest)
				return
			}

			result, rpcErr, err := jsonRPCCall(r.Context(), target, "AbandonTourExecution", map[string]interface{}{
				"executionId": executionID,
				"latitude":    body.Latitude,
				"longitude":   body.Longitude,
			}, r.Header.Get("Authorization"))
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
	purchase := getEnv("PURCHASE_SERVICE_URL", "http://purchase-service:"+getEnv("PURCHASE_SERVICE_PORT", "8085"))
	purchaseGrpcAddr := getEnv("PURCHASE_SERVICE_GRPC_ADDR", "purchase-service:"+getEnv("PURCHASE_SERVICE_GRPC_PORT", "9095"))
	follower := getEnv("FOLLOWER_SERVICE_URL", "http://follower-service:"+getEnv("FOLLOWER_SERVICE_PORT", "8082"))
	frontend := getEnv("FRONTEND_URL", "http://frontend:"+getEnv("FRONTEND_CONTAINER_PORT", "80"))
	addr := getEnv("GATEWAY_ADDRESS", ":8000")

	purchaseGateway, err := newPurchaseGrpcGateway(purchaseGrpcAddr)
	if err != nil {
		log.Fatalf("failed to connect purchase gRPC: %v", err)
	}

	// Prefer an explicit gRPC address for the tour service. If the env var is not set
	// we will not attempt a gRPC connection and will use JSON-RPC HTTP fallback.
	var tourGateway *tourGrpcGateway
	if v := os.Getenv("TOUR_SERVICE_GRPC_ADDR"); v != "" {
		addr := strings.TrimPrefix(v, "http://")
		addr = strings.TrimPrefix(addr, "https://")
		g, err := newTourGrpcGateway(addr, tour)
		if err != nil {
			log.Printf("failed to connect tour gRPC (%s): %v; falling back to JSON-RPC", addr, err)
			tourGateway = nil
		} else {
			log.Printf("connected to tour gRPC at %s", addr)
			tourGateway = g
		}
	} else {
		log.Printf("TOUR_SERVICE_GRPC_ADDR not set, using JSON-RPC for tour-service")
	}

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
	if tourGateway != nil {
		mux.Handle("/api/tour-executions", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { tourGateway.handleTourExecution(w, r, tourProxy) }))
		mux.Handle("/api/tour-executions/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { tourGateway.handleTourExecution(w, r, tourProxy) }))
	} else {
		mux.Handle("/api/tour-executions", handleTourExecutionRPC(tour, tourProxy))
		mux.Handle("/api/tour-executions/", handleTourExecutionRPC(tour, tourProxy))
	}
	mux.Handle("/api/user-positions", tourProxy)
	mux.Handle("/api/user-positions/", tourProxy)

	// Stakeholders service (users, auth)
	mux.Handle("/api/stakeholders", proxyTo(stakeholders))
	mux.Handle("/api/stakeholders/", proxyTo(stakeholders))
	mux.Handle("/api/auth", proxyTo(stakeholders))
	mux.Handle("/api/auth/", proxyTo(stakeholders))
	mux.Handle("/api/users", proxyTo(stakeholders))
	mux.Handle("/api/users/", proxyTo(stakeholders))

	// Purchase service (cart) — AddToCart & Checkout via gRPC; rest via REST proxy
	purchaseProxy := proxyTo(purchase)
	mux.Handle("/api/cart", handlePurchaseGRPC(purchaseGateway, purchaseProxy))
	mux.Handle("/api/cart/", handlePurchaseGRPC(purchaseGateway, purchaseProxy))

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
