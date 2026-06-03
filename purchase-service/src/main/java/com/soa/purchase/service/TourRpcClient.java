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

    /**
     * SAGA KORAK: Registruje kupovinu u Tour servisu.
     */
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

            return response.statusCode() == 200 && !root.has("error");
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
                throw new IllegalArgumentException("RPC Error: " + (root.has("error") ? root.get("error").get("message").asText() : "Unknown"));
            }

            JsonNode result = root.get("result");
            return TourPurchaseInfo.builder()
                    .id(readText(result, "id", "Id"))
                    .name(readText(result, "name", "Name"))
                    .price(readDecimal(result, "price", "Price"))
                    .status(readText(result, "status", "Status"))
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("RPC Call failed: " + e.getMessage());
        }
    }

    private String readText(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            if (node.hasNonNull(fieldName)) return node.get(fieldName).asText();
        }
        return "";
    }

    private BigDecimal readDecimal(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            if (node.hasNonNull(fieldName)) return node.get(fieldName).decimalValue();
        }
        return BigDecimal.ZERO;
    }
}