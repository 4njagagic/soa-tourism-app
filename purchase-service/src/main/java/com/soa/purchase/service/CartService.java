package com.soa.purchase.service;

import com.soa.purchase.dto.CartResponse;
import com.soa.purchase.dto.CheckoutResponse;
import com.soa.purchase.dto.OrderItemResponse;
import com.soa.purchase.dto.PurchaseTokenDto;
import com.soa.purchase.dto.TourPurchaseInfo;
import com.soa.purchase.model.OrderItem;
import com.soa.purchase.model.ShoppingCart;
import com.soa.purchase.model.TourPurchaseToken;
import com.soa.purchase.repository.ShoppingCartRepository;
import com.soa.purchase.repository.TourPurchaseTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CartService {

    private final ShoppingCartRepository cartRepository;
    private final TourPurchaseTokenRepository tokenRepository;
    private final TourRpcClient tourRpcClient;

    @Transactional(readOnly = true)
    public CartResponse getCart(String username) {
        return cartRepository.findByUsername(username)
                .map(this::toCartResponse)
                .orElse(emptyCartResponse(username));
    }

    @Transactional
    public CartResponse addToCart(String username, String tourId) {
        if (tokenRepository.existsByUsernameAndTourId(username, tourId)) {
            throw new IllegalArgumentException("Tour is already purchased.");
        }

        TourPurchaseInfo tour = tourRpcClient.validateTourForPurchase(tourId);

        ShoppingCart cart = cartRepository.findByUsername(username)
                .orElseGet(() -> cartRepository.save(ShoppingCart.builder()
                        .username(username)
                        .totalPrice(BigDecimal.ZERO)
                        .items(new ArrayList<>())
                        .build()));

        boolean alreadyInCart = cart.getItems().stream()
                .anyMatch(item -> item.getTourId().equals(tourId));
        if (alreadyInCart) {
            throw new IllegalArgumentException("Tour is already in the cart.");
        }

        OrderItem item = OrderItem.builder()
                .cart(cart)
                .tourId(tour.getId())
                .tourName(tour.getName())
                .price(tour.getPrice())
                .build();
        cart.getItems().add(item);
        cart.recalculateTotal();

        return toCartResponse(cartRepository.save(cart));
    }

    @Transactional
    public CartResponse removeFromCart(String username, String tourId) {
        ShoppingCart cart = cartRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Cart is empty."));

        boolean removed = cart.getItems().removeIf(item -> item.getTourId().equals(tourId));
        if (!removed) {
            throw new IllegalArgumentException("Tour is not in the cart.");
        }

        cart.recalculateTotal();
        return toCartResponse(cartRepository.save(cart));
    }

    @Transactional
    public CheckoutResponse checkout(String username) {
        ShoppingCart cart = cartRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Cart is empty."));

        if (cart.getItems().isEmpty()) {
            throw new IllegalArgumentException("Cart is empty.");
        }

        BigDecimal totalPaid = cart.getTotalPrice();
        List<CheckoutResponse.PurchaseTokenResponse> tokens = new ArrayList<>();

        for (OrderItem item : List.copyOf(cart.getItems())) {
            tourRpcClient.validateTourForPurchase(item.getTourId());

            String tokenValue = UUID.randomUUID().toString();
            Instant purchasedAt = Instant.now();

            tokenRepository.save(TourPurchaseToken.builder()
                    .username(username)
                    .tourId(item.getTourId())
                    .token(tokenValue)
                    .purchasedAt(purchasedAt)
                    .build());

            tokens.add(CheckoutResponse.PurchaseTokenResponse.builder()
                    .tourId(item.getTourId())
                    .tourName(item.getTourName())
                    .token(tokenValue)
                    .purchasedAt(purchasedAt)
                    .build());
        }

        cart.getItems().clear();
        cart.recalculateTotal();
        cartRepository.save(cart);

        return CheckoutResponse.builder()
                .totalPaid(totalPaid)
                .tokens(tokens)
                .build();
    }

    @Transactional(readOnly = true)
    public List<PurchaseTokenDto> getPurchases(String username) {
        return tokenRepository.findByUsername(username).stream()
                .map(token -> PurchaseTokenDto.builder()
                        .tourId(token.getTourId())
                        .token(token.getToken())
                        .purchasedAt(token.getPurchasedAt())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean hasPurchased(String username, String tourId) {
        return tokenRepository.existsByUsernameAndTourId(username, tourId);
    }

    private CartResponse toCartResponse(ShoppingCart cart) {
        List<OrderItemResponse> items = cart.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .tourId(item.getTourId())
                        .tourName(item.getTourName())
                        .price(item.getPrice())
                        .build())
                .toList();

        return CartResponse.builder()
                .username(cart.getUsername())
                .totalPrice(cart.getTotalPrice())
                .items(items)
                .build();
    }

    private CartResponse emptyCartResponse(String username) {
        return CartResponse.builder()
                .username(username)
                .totalPrice(BigDecimal.ZERO)
                .items(List.of())
                .build();
    }
}
