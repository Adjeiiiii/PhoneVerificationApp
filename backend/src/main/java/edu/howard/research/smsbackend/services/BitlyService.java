package edu.howard.research.smsbackend.services;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Service for shortening URLs using Bit.ly API v4.
 * Automatically shortens long URLs and handles errors gracefully.
 */
@Slf4j
@Service
public class BitlyService {

    private static final String BITLY_API_URL = "https://api-ssl.bitly.com/v4/shorten";
    
    private final String apiToken;
    private final RestTemplate restTemplate;

    public BitlyService(@Value("${bitly.apiToken:}") String apiToken) {
        this.apiToken = apiToken;
        this.restTemplate = new RestTemplate();
    }

    /**
     * Shortens a long URL using Bit.ly API.
     * 
     * @param longUrl The long URL to shorten
     * @return The shortened URL, or null if shortening fails
     */
    public String shortenUrl(String longUrl) {
        // If API token is not configured, return null (fail gracefully)
        if (apiToken == null || apiToken.isBlank()) {
            log.warn("Bit.ly API token not configured. Skipping URL shortening for: {}", longUrl);
            return null;
        }

        // If URL is null or empty, return null
        if (longUrl == null || longUrl.isBlank()) {
            log.warn("Cannot shorten null or empty URL");
            return null;
        }

        try {
            // Prepare request headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiToken);

            // Prepare request body
            Map<String, String> requestBody = Map.of("long_url", longUrl);

            // Create HTTP entity
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            // Make API call
            ResponseEntity<BitlyResponse> response = restTemplate.exchange(
                    BITLY_API_URL,
                    HttpMethod.POST,
                    request,
                    BitlyResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String shortUrl = response.getBody().getLink();
                log.info("Successfully shortened URL: {} -> {}", longUrl, shortUrl);
                return shortUrl;
            } else {
                log.warn("Bit.ly API returned non-success status: {} for URL: {}", 
                        response.getStatusCode(), longUrl);
                return null;
            }

        } catch (RestClientException e) {
            log.error("Error calling Bit.ly API to shorten URL {}: {}", longUrl, e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("Unexpected error shortening URL {}: {}", longUrl, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Response DTO for Bit.ly API v4 shorten endpoint.
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    static class BitlyResponse {
        @JsonProperty("link")
        private String link;
        
        @JsonProperty("id")
        private String id;
        
        @JsonProperty("long_url")
        private String longUrl;
    }
}

