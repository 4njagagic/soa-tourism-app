package com.soa.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourPurchaseInfo {
    private String id;
    private String name;
    private BigDecimal price;
    private String status;
}
