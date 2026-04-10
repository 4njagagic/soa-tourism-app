package service

import "fmt"

type ValidationError struct {
	Message string
}

func (e ValidationError) Error() string { return e.Message }

func ErrValidation(msg string) error {
	return ValidationError{Message: msg}
}

func IsValidation(err error) bool {
	_, ok := err.(ValidationError)
	return ok
}

func Wrap(op string, err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("%s: %w", op, err)
}
