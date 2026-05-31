package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	purchasev1 "soa-tourism-app/api-gateway/gen/purchase/v1"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type purchaseGrpcGateway struct {
	client purchasev1.CartServiceClient
}

func newPurchaseGrpcGateway(addr string) (*purchaseGrpcGateway, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	return &purchaseGrpcGateway{
		client: purchasev1.NewCartServiceClient(conn),
	}, nil
}

func (g *purchaseGrpcGateway) handlePurchase(w http.ResponseWriter, r *http.Request, proxy http.Handler) {
	path := strings.TrimPrefix(r.URL.Path, "/api/cart")

	if r.Method == http.MethodPost && (path == "/items" || path == "/items/") {
		var body struct {
			TourID string `json:"tourId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TourID == "" {
			http.Error(w, "Invalid request body: tourId is required", http.StatusBadRequest)
			return
		}

		ctx := withAuthorizationMetadata(r.Context(), r.Header.Get("Authorization"))
		resp, err := g.client.AddToCart(ctx, &purchasev1.AddToCartRequest{TourId: body.TourID})
		if err != nil {
			writeGrpcError(w, err)
			return
		}

		writeJSON(w, cartResponseToJSON(resp))
		return
	}

	if r.Method == http.MethodPost && (path == "/checkout" || path == "/checkout/") {
		ctx := withAuthorizationMetadata(r.Context(), r.Header.Get("Authorization"))
		resp, err := g.client.Checkout(ctx, &purchasev1.CheckoutRequest{})
		if err != nil {
			writeGrpcError(w, err)
			return
		}

		writeJSON(w, checkoutResponseToJSON(resp))
		return
	}

	proxy.ServeHTTP(w, r)
}

func withAuthorizationMetadata(ctx context.Context, authorization string) context.Context {
	if authorization == "" {
		return ctx
	}
	return metadata.NewOutgoingContext(ctx, metadata.Pairs("authorization", authorization))
}

func writeGrpcError(w http.ResponseWriter, err error) {
	st, ok := status.FromError(err)
	if !ok {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	code := http.StatusBadGateway
	switch st.Code() {
	case codes.Unauthenticated:
		code = http.StatusUnauthorized
	case codes.InvalidArgument:
		code = http.StatusBadRequest
	case codes.NotFound:
		code = http.StatusNotFound
	}

	http.Error(w, st.Message(), code)
}

func writeJSON(w http.ResponseWriter, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(payload)
}

func cartResponseToJSON(c *purchasev1.CartResponse) map[string]interface{} {
	items := make([]map[string]interface{}, 0, len(c.GetItems()))
	for _, item := range c.GetItems() {
		items = append(items, map[string]interface{}{
			"tourId":   item.GetTourId(),
			"tourName": item.GetTourName(),
			"price":    parseDecimal(item.GetPrice()),
		})
	}

	return map[string]interface{}{
		"username":   c.GetUsername(),
		"totalPrice": parseDecimal(c.GetTotalPrice()),
		"items":      items,
	}
}

func checkoutResponseToJSON(c *purchasev1.CheckoutResponse) map[string]interface{} {
	tokens := make([]map[string]interface{}, 0, len(c.GetTokens()))
	for _, token := range c.GetTokens() {
		tokens = append(tokens, map[string]interface{}{
			"tourId":      token.GetTourId(),
			"tourName":    token.GetTourName(),
			"token":       token.GetToken(),
			"purchasedAt": token.GetPurchasedAt(),
		})
	}

	return map[string]interface{}{
		"totalPaid": parseDecimal(c.GetTotalPaid()),
		"tokens":    tokens,
	}
}

func parseDecimal(value string) float64 {
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0
	}
	return parsed
}
