package config

import "os"

type Config struct {
	Address     string
	SomeAddress string
}

func GetConfig() Config {
	address := os.Getenv("GATEWAY_ADDRESS")
	if address == "" {
		address = ":8000"
	}

	return Config{
		SomeAddress: os.Getenv("blablabla"),
		Address:     address,
	}
}
