package markdown

import (
	"blog-service/internal/errs"
)

// Render is an optional helper if you decide to render Markdown on the server.
// For now, keep the description stored as raw Markdown (DescriptionMD).
func Render(md string) (string, error) {
	_ = md
	return "", errs.ErrNotImplemented
}
