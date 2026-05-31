package com.soa.purchase.grpc;

import com.soa.purchase.dto.CartResponse;
import com.soa.purchase.dto.CheckoutResponse;
import com.soa.purchase.service.CartService;
import com.soa.purchase.service.JwtService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.RoundingMode;

@Component
@RequiredArgsConstructor
public class CartGrpcService extends CartServiceGrpc.CartServiceImplBase {

    private final CartService cartService;
    private final JwtService jwtService;

    @Override
    public void addToCart(AddToCartRequest request, StreamObserver<com.soa.purchase.grpc.CartResponse> responseObserver) {
        String username = requireUsername(responseObserver);
        if (username == null) {
            return;
        }

        if (request.getTourId().isBlank()) {
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription("tour_id is required")
                    .asRuntimeException());
            return;
        }

        try {
            CartResponse cart = cartService.addToCart(username, request.getTourId());
            responseObserver.onNext(toProto(cart));
            responseObserver.onCompleted();
        } catch (IllegalArgumentException e) {
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        }
    }

    @Override
    public void checkout(CheckoutRequest request, StreamObserver<com.soa.purchase.grpc.CheckoutResponse> responseObserver) {
        String username = requireUsername(responseObserver);
        if (username == null) {
            return;
        }

        try {
            CheckoutResponse result = cartService.checkout(username);
            responseObserver.onNext(toCheckoutProto(result));
            responseObserver.onCompleted();
        } catch (IllegalArgumentException e) {
            responseObserver.onError(Status.INVALID_ARGUMENT
                    .withDescription(e.getMessage())
                    .asRuntimeException());
        }
    }

    private String requireUsername(StreamObserver<?> responseObserver) {
        String authorization = AuthorizationGrpcInterceptor.AUTHORIZATION_KEY.get();
        String username = jwtService.extractUsername(authorization);
        if (username == null) {
            responseObserver.onError(Status.UNAUTHENTICATED
                    .withDescription("Unauthorized")
                    .asRuntimeException());
            return null;
        }
        return username;
    }

    private com.soa.purchase.grpc.CartResponse toProto(CartResponse cart) {
        com.soa.purchase.grpc.CartResponse.Builder builder = com.soa.purchase.grpc.CartResponse.newBuilder()
                .setUsername(cart.getUsername())
                .setTotalPrice(cart.getTotalPrice().setScale(2, RoundingMode.HALF_UP).toPlainString());

        cart.getItems().forEach(item -> builder.addItems(
                OrderItem.newBuilder()
                        .setTourId(item.getTourId())
                        .setTourName(item.getTourName())
                        .setPrice(item.getPrice().setScale(2, RoundingMode.HALF_UP).toPlainString())
                        .build()));

        return builder.build();
    }

    private com.soa.purchase.grpc.CheckoutResponse toCheckoutProto(CheckoutResponse checkout) {
        com.soa.purchase.grpc.CheckoutResponse.Builder builder = com.soa.purchase.grpc.CheckoutResponse.newBuilder()
                .setTotalPaid(checkout.getTotalPaid().setScale(2, RoundingMode.HALF_UP).toPlainString());

        checkout.getTokens().forEach(token -> builder.addTokens(
                PurchaseToken.newBuilder()
                        .setTourId(token.getTourId())
                        .setTourName(token.getTourName())
                        .setToken(token.getToken())
                        .setPurchasedAt(token.getPurchasedAt().toString())
                        .build()));

        return builder.build();
    }
}
