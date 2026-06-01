package main

import (
    "encoding/json"
    "log"
    "net/http"
    "strings"

    tourv1 "soa-tourism-app/api-gateway/gen/tour/v1"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

type tourGrpcGateway struct {
    client tourv1.TourExecutionServiceClient
    rpcTarget string
}
func newTourGrpcGateway(addr, rpcTarget string) (*tourGrpcGateway, error) {
    conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        return nil, err
    }
    return &tourGrpcGateway{client: tourv1.NewTourExecutionServiceClient(conn), rpcTarget: rpcTarget}, nil
}

func (g *tourGrpcGateway) handleTourExecution(w http.ResponseWriter, r *http.Request, proxy http.Handler) {
    path := strings.TrimPrefix(r.URL.Path, "/api/tour-executions")

    if r.Method == http.MethodPost && path == "/start" {
        var body struct{
            TourID string `json:"tourId"`
            Latitude float64 `json:"latitude"`
            Longitude float64 `json:"longitude"`
        }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.TourID == "" {
            http.Error(w, "Invalid request body: tourId is required", http.StatusBadRequest)
            return
        }

        ctx := withAuthorizationMetadata(r.Context(), r.Header.Get("Authorization"))
        // include bearer token in request body so server can validate and extract username
        bearer := r.Header.Get("Authorization")
        const prefix = "Bearer "
        if strings.HasPrefix(bearer, prefix) {
            bearer = bearer[len(prefix):]
        }
        log.Printf("tour-gateway: calling gRPC StartTourExecution tourId=%s", body.TourID)
        resp, err := g.client.StartTourExecution(ctx, &tourv1.StartRequest{
            TourId: body.TourID,
            Latitude: body.Latitude,
            Longitude: body.Longitude,
            BearerToken: bearer,
        })
        if err != nil {
            // Some generated proto packages can cause marshal errors when
            // the message type doesn't implement the newer proto.Message
            // interface. If that happens, fall back to the JSON-RPC HTTP
            // endpoint on the tour service so the gateway remains usable.
            if strings.Contains(err.Error(), "failed to marshal") || strings.Contains(err.Error(), "proto:") {
                log.Printf("tour-gateway: fallback to JSON-RPC StartTourExecution tourId=%s, reason=%v", body.TourID, err)
                result, rpcErr, rpcCallErr := jsonRPCCall(r.Context(), g.rpcTarget, "StartTourExecution", map[string]interface{}{
                    "tourId": body.TourID,
                    "latitude": body.Latitude,
                    "longitude": body.Longitude,
                }, r.Header.Get("Authorization"))
                if rpcCallErr != nil {
                    writeGrpcError(w, rpcCallErr)
                    return
                }
                if rpcErr != nil {
                    status := rpcErr.Code
                    if status < 100 || status >= 600 {
                        status = http.StatusBadRequest
                    }
                    http.Error(w, rpcErr.Message, status)
                    return
                }
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusOK)
                w.Write(*result)
                return
            }
            writeGrpcError(w, err)
            return
        }

        writeJSON(w, resp)
        return
    }

    if r.Method == http.MethodPost && strings.HasSuffix(path, "/check-nearby-key-point") {
        executionID := strings.TrimSuffix(path, "/check-nearby-key-point")
        executionID = strings.TrimPrefix(executionID, "/")
        if executionID == "" { proxy.ServeHTTP(w, r); return }

        var body struct{
            Latitude float64 `json:"latitude"`
            Longitude float64 `json:"longitude"`
        }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
            http.Error(w, "Invalid request body", http.StatusBadRequest)
            return
        }

        ctx := withAuthorizationMetadata(r.Context(), r.Header.Get("Authorization"))
        // similarly, token carries user info; we don't require username in request
        log.Printf("tour-gateway: calling gRPC CheckNearbyKeyPoint executionId=%s", executionID)
        resp, err := g.client.CheckNearbyKeyPoint(ctx, &tourv1.CheckRequest{
            ExecutionId: executionID,
            Latitude: body.Latitude,
            Longitude: body.Longitude,
        })
        if err != nil {
            if strings.Contains(err.Error(), "failed to marshal") || strings.Contains(err.Error(), "proto:") {
                log.Printf("tour-gateway: fallback to JSON-RPC CheckNearbyKeyPoint executionId=%s, reason=%v", executionID, err)
                result, rpcErr, rpcCallErr := jsonRPCCall(r.Context(), g.rpcTarget, "CheckNearbyKeyPoint", map[string]interface{}{
                    "executionId": executionID,
                    "latitude": body.Latitude,
                    "longitude": body.Longitude,
                }, r.Header.Get("Authorization"))
                if rpcCallErr != nil {
                    writeGrpcError(w, rpcCallErr)
                    return
                }
                if rpcErr != nil {
                    status := rpcErr.Code
                    if status < 100 || status >= 600 {
                        status = http.StatusBadRequest
                    }
                    http.Error(w, rpcErr.Message, status)
                    return
                }
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusOK)
                w.Write(*result)
                return
            }
            writeGrpcError(w, err)
            return
        }

        writeJSON(w, resp)
        return
    }

    if r.Method == http.MethodGet && path != "" {
        executionID := strings.TrimPrefix(path, "/")
        if executionID == "" { proxy.ServeHTTP(w, r); return }

        // No gRPC Get method available in the proto; use JSON-RPC fallback
        log.Printf("tour-gateway: GET execution via JSON-RPC GetTourExecution id=%s", executionID)
        result, rpcErr, rpcCallErr := jsonRPCCall(r.Context(), g.rpcTarget, "GetTourExecution", map[string]interface{}{"id": executionID}, r.Header.Get("Authorization"))
        if rpcCallErr != nil {
            writeGrpcError(w, rpcCallErr)
            return
        }
        if rpcErr != nil {
            status := rpcErr.Code
            if status < 100 || status >= 600 {
                status = http.StatusBadRequest
            }
            http.Error(w, rpcErr.Message, status)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusOK)
        w.Write(*result)
        return
    }

    proxy.ServeHTTP(w, r)
}

// writeGrpcError is provided in purchase_grpc.go; reuse that implementation.
