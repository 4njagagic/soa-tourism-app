package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"soa-tourism-app/api-gateway/config"
	"syscall"
	"time"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	cfg := config.GetConfig()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// grpcMux translates incoming HTTP requests into gRPC calls.
	grpcMux := runtime.NewServeMux()

	dialOpts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}

	if err := registerHandlers(ctx, grpcMux, cfg, dialOpts); err != nil {
		log.Fatalf("register gateway handlers: %v", err)
	}

	httpMux := http.NewServeMux()
	httpMux.Handle("/", grpcMux)

	gwServer := &http.Server{
		Addr:    cfg.Address,
		Handler: httpMux,
	}

	go func() {
		log.Printf("api-gateway listening on %s", cfg.Address)
		if err := gwServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("server error: %v", err)
			stop()
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := gwServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("error while stopping server: %v", err)
	}
}

func registerHandlers(ctx context.Context, mux *runtime.ServeMux, cfg config.Config, dialOpts []grpc.DialOption) error {
	// Add generated grpc-gateway handlers here, e.g.:
	// if err := stakeholders.RegisterStakeholderServiceHandler(
	// 	ctx, mux, cfg.SomeAddress, dialOpts,
	// ); err != nil {
	// 	return err
	// }
	return nil
}
