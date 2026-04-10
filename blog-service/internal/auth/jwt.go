package auth

import (
	"errors"
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrMissingAuthHeader = errors.New("missing Authorization header")
	ErrInvalidAuthHeader = errors.New("invalid Authorization header")
	ErrInvalidToken      = errors.New("invalid token")
)

// UsernameFromAuthorizationHeader validates HS512 JWT and returns the subject (username).
// This matches stakeholders-service where JWT subject is set to username.
func UsernameFromAuthorizationHeader(authorizationHeader string, secret string) (string, error) {
	if strings.TrimSpace(authorizationHeader) == "" {
		return "", ErrMissingAuthHeader
	}
	const prefix = "Bearer "
	if !strings.HasPrefix(authorizationHeader, prefix) {
		return "", ErrInvalidAuthHeader
	}
	tokenString := strings.TrimSpace(strings.TrimPrefix(authorizationHeader, prefix))
	if tokenString == "" {
		return "", ErrInvalidAuthHeader
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if token.Method == nil || token.Method.Alg() != jwt.SigningMethodHS512.Alg() {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return "", ErrInvalidToken
	}
	if !token.Valid {
		return "", ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", ErrInvalidToken
	}

	sub, _ := claims["sub"].(string)
	if strings.TrimSpace(sub) == "" {
		return "", ErrInvalidToken
	}
	return sub, nil
}
