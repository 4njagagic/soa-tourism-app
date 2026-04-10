package dto

type CreateCommentRequest struct {
	Text string `json:"text"`
}

type UpdateCommentRequest struct {
	Text string `json:"text"`
}

type CommentResponse struct {
	ID        string `json:"id"`
	BlogID    string `json:"blogId"`
	Text      string `json:"text"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`

	AuthorUsername string `json:"authorUsername"`
}
