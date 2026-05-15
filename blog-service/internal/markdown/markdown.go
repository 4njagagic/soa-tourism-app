package markdown

import (
	"blog-service/internal/errs"
)

func Render(md string) (string, error) {
	_ = md
	return "", errs.ErrNotImplemented
}
