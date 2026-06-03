package com.soa.purchase.controller;

import com.soa.purchase.dto.CartResponse;
import com.soa.purchase.dto.PurchaseTokenDto;
import com.soa.purchase.service.CartService;
import com.soa.purchase.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final JwtService jwtService;

    @GetMapping
    public ResponseEntity<?> getCart(@RequestHeader(value = "Authorization", required = false) String authorization) {
        String username = requireUsername(authorization);
        if (username == null) {
            return unauthorized();
        }
        return ResponseEntity.ok(cartService.getCart(username));
    }

    @DeleteMapping("/items/{tourId}")
    public ResponseEntity<?> removeItem(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String tourId) {
        String username = requireUsername(authorization);
        if (username == null) {
            return unauthorized();
        }
        try {
            CartResponse cart = cartService.removeFromCart(username, tourId);
            return ResponseEntity.ok(cart);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/purchases")
    public ResponseEntity<?> getPurchases(@RequestHeader(value = "Authorization", required = false) String authorization) {
        String username = requireUsername(authorization);
        if (username == null) {
            return unauthorized();
        }
        List<PurchaseTokenDto> purchases = cartService.getPurchases(username);
        return ResponseEntity.ok(purchases);
    }

    @GetMapping("/purchases/{tourId}")
    public ResponseEntity<?> hasPurchased(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable String tourId) {
        String username = requireUsername(authorization);
        if (username == null) {
            return unauthorized();
        }
        boolean purchased = cartService.hasPurchased(username, tourId);
        return ResponseEntity.ok(Map.of("purchased", purchased));
    }

    private String requireUsername(String authorization) {
        return jwtService.extractUsername(authorization);
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Unauthorized"));
    }
}
