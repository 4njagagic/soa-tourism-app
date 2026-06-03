package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type StakeholdersClient struct {
	BaseURL string
	client  *http.Client
}

func NewStakeholdersClient(baseURL string) *StakeholdersClient {
	return &StakeholdersClient{
		BaseURL: baseURL,
		client:  &http.Client{Timeout: 5 * time.Second},
	}
}

type UserProfile struct {
	Username string `json:"username"`
	Enabled  bool   `json:"enabled"`
	Role     string `json:"role"`
}

func (c *StakeholdersClient) GetUserProfile(ctx context.Context, username string) (*UserProfile, error) {
	url := fmt.Sprintf("%s/users/profile/%s", c.BaseURL, username)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("stakeholders service returned status %d", resp.StatusCode)
	}

	var profile UserProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, err
	}
	return &profile, nil
}