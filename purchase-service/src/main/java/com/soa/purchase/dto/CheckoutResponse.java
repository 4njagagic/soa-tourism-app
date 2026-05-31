package com.soa.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutResponse {
    private BigDecimal totalPaid;
    private List<PurchaseTokenResponse> tokens;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseTokenResponse {
        private String tourId;
        private String tourName;
        private String token;
        private Instant purchasedAt;
    }
}
