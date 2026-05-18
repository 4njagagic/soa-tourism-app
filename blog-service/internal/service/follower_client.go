package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type FollowerClient struct {
	baseURL string
	client  *http.Client
}

func NewFollowerClient(baseURL string) *FollowerClient {
	return &FollowerClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// GetFollowedUsers returns the list of usernames that the given user follows
func (c *FollowerClient) GetFollowedUsers(username string) ([]string, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/followed", c.baseURL), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("X-Username", username)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("follower service request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("follower service returned status %d: %s", resp.StatusCode, string(body))
	}

	var followed []string
	if err := json.NewDecoder(resp.Body).Decode(&followed); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return followed, nil
}
