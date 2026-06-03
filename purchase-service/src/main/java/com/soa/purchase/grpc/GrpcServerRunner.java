package com.soa.purchase.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@RequiredArgsConstructor
public class GrpcServerRunner {

    private final CartGrpcService cartGrpcService;
    private final AuthorizationGrpcInterceptor authorizationGrpcInterceptor;

    @Value("${grpc.server.port:9095}")
    private int grpcPort;

    private Server server;

    @EventListener(ApplicationReadyEvent.class)
    public void start() throws IOException {
        server = ServerBuilder.forPort(grpcPort)
                .intercept(authorizationGrpcInterceptor)
                .addService(cartGrpcService)
                .build()
                .start();

        log.info("gRPC server started on port {}", grpcPort);
    }

    @PreDestroy
    public void stop() throws InterruptedException {
        if (server != null) {
            server.shutdown();
            if (!server.awaitTermination(5, TimeUnit.SECONDS)) {
                server.shutdownNow();
            }
            log.info("gRPC server stopped");
        }
    }
}
