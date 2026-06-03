package com.soa.purchase.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
@RequiredArgsConstructor
public class StakeholdersClient {

    @Value("${stakeholders-service.url}")
    private String stakeholdersUrl;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void debit(String username, BigDecimal amount) {
        callInternalPayment(username, amount, "/users/internal/debit");
    }

    public void credit(String username, BigDecimal amount) {
        callInternalPayment(username, amount, "/users/internal/credit");
    }

    private void callInternalPayment(String username, BigDecimal amount, String path) {
        try {
            String url = String.format("%s%s?username=%s&amount=%s", 
                    stakeholdersUrl.trim(), path, username, amount.toString());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                throw new RuntimeException("Payment service error: " + response.body());
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to reach Stakeholders service: " + e.getMessage());
        }
    }
}