package dto

// CreateBlogRequest is the expected JSON payload for creating a blog.
// Description is Markdown.
type CreateBlogRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	ImageURLs   []string `json:"imageUrls,omitempty"`
}

type BlogResponse struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	CreatedAt      string `json:"createdAt"`
	ImageURLs      []string `json:"imageUrls,omitempty"`
	AuthorUsername string `json:"authorUsername"`
	LikesCount     int    `json:"likesCount"`
	UserHasLiked   *bool  `json:"userHasLiked,omitempty"`
}
