package com.soa.purchase.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.soa.purchase.dto.TourPurchaseInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TourRpcClient {

    private final ObjectMapper objectMapper;

    @Value("${tour-service.url}")
    private String tourServiceUrl;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public TourPurchaseInfo validateTourForPurchase(String tourId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("jsonrpc", "2.0");
        payload.put("method", "ValidateTourForPurchase");
        payload.put("params", Map.of("id", tourId));
        payload.put("id", 1);

        return executeRequest(payload);
    }

    //saga: registruje kupovinu u tour servisu
     
    public boolean registerPurchase(String tourId, String username) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("jsonrpc", "2.0");
        payload.put("method", "RegisterPurchase");
        payload.put("params", Map.of(
                "tourId", tourId,
                "username", username
        ));
        payload.put("id", 1);

        try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(tourServiceUrl + "/rpc"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());

            boolean hasError = root.has("error") && !root.get("error").isNull();

            return response.statusCode() == 200 && !hasError;
        } catch (Exception e) {
            return false;
        }
    }

    private TourPurchaseInfo executeRequest(Map<String, Object> payload) {
          try {
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(tourServiceUrl + "/rpc"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());

            if (response.statusCode() >= 400 || (root.has("error") && !root.get("error").isNull())) {
                String errorMsg = root.has("error") ? extractErrorMessage(root.get("error")) : "HTTP " + response.statusCode();
                throw new IllegalArgumentException("RPC Error: " + errorMsg);
            }

            JsonNode result = root.get("result");
            if (result == null || result.isNull()) {
                throw new IllegalArgumentException("Tour validation returned empty result.");
            }

            return TourPurchaseInfo.builder()
                    .id(readText(result, "id", "Id"))
                    .name(readText(result, "name", "Name"))
                    .price(readDecimal(result, "price", "Price"))
                    .status(readText(result, "status", "Status"))
                    .build();
        } catch (IllegalArgumentException e) {
            throw e; 
        } catch (Exception e) {
            throw new RuntimeException("RPC Call failed: " + e.getMessage());
        }
    }

    private String readText(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode value = node.get(fieldName);
            if (value != null && !value.isNull()) {
                return value.asText();
            }
        }
        throw new IllegalArgumentException("Missing required field in tour validation response.");
    }

    private BigDecimal readDecimal(JsonNode node, String... fieldNames) {
       for (String fieldName : fieldNames) {
            JsonNode value = node.get(fieldName);
            if (value != null && !value.isNull()) {
                if (value.isNumber()) {
                    return value.decimalValue();
                }
                return new BigDecimal(value.asText());
            }
        }
        throw new IllegalArgumentException("Missing price in tour validation response.");
    }
     private String extractErrorMessage(JsonNode error) {
        if (error.hasNonNull("message")) return error.get("message").asText();
        if (error.hasNonNull("Message")) return error.get("Message").asText();
        return "Tour validation failed";
    }
}