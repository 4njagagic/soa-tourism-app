# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/blog-service ./cmd/blog-service

# Runtime stage
FROM alpine:3.20

RUN adduser -D -H -s /sbin/nologin appuser \
  && apk add --no-cache ca-certificates

WORKDIR /app

RUN mkdir -p /app/uploads \
  && chown -R appuser:appuser /app

COPY --from=builder /out/blog-service ./blog-service

USER appuser

EXPOSE 8082

ENTRYPOINT ["/app/blog-service"]
