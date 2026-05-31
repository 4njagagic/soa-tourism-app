package com.soa.purchase.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "tour_purchase_tokens", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"username", "tour_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TourPurchaseToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(name = "tour_id", nullable = false)
    private String tourId;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private Instant purchasedAt;
}
