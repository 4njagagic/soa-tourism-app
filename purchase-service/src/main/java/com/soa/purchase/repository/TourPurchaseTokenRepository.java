package com.soa.purchase.repository;

import com.soa.purchase.model.TourPurchaseToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TourPurchaseTokenRepository extends JpaRepository<TourPurchaseToken, Long> {
    List<TourPurchaseToken> findByUsername(String username);

    Optional<TourPurchaseToken> findByUsernameAndTourId(String username, String tourId);

    boolean existsByUsernameAndTourId(String username, String tourId);
}
