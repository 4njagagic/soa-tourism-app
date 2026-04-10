package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port string

	JWTSecret       string
	CORSAllowOrigin string

	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string
}

func FromEnv() Config {
	return Config{
		Port: env("PORT", "8082"),

		JWTSecret:       env("JWT_SECRET", "mySecretKeyForJWTTokenGenerationAndValidationPurposeOnlyForDevelopmentAndTestingEnvironment"),
		CORSAllowOrigin: env("CORS_ALLOW_ORIGIN", ""),

		DBHost:     env("DB_HOST", "localhost"),
		DBPort:     env("DB_PORT", "5432"),
		DBName:     env("DB_NAME", "blog_db"),
		DBUser:     env("DB_USER", "blog_user"),
		DBPassword: env("DB_PASSWORD", "blog_pass"),
	}
}

func (c Config) Addr() string {
	return fmt.Sprintf(":%s", c.Port)
}

func (c Config) DSN() string {
	// Placeholder DSN format (you can switch to pgx/libpq later).
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName)
}

func env(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}
