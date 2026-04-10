package middleware

import (
	"context"
	"net/http"

	"blog-service/internal/auth"
	"blog-service/internal/config"
)

type ctxKey string

const usernameKey ctxKey = "username"

func UsernameFromContext(ctx context.Context) (string, bool) {
	v := ctx.Value(usernameKey)
	s, ok := v.(string)
	return s, ok
}

func RequireAuth(cfg config.Config, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		username, err := auth.UsernameFromAuthorizationHeader(r.Header.Get("Authorization"), cfg.JWTSecret)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
			return
		}

		ctx := context.WithValue(r.Context(), usernameKey, username)
		next(w, r.WithContext(ctx))
	}
}
