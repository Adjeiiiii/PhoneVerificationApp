package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.repositories.SurveyLinkPoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

/**
 * Service for generating and managing short link codes.
 * Generates random 6-character alphanumeric codes with collision detection.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ShortLinkService {

    private static final String CHARACTERS = 
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 6;
    private static final int MAX_RETRIES = 10;

    private final SurveyLinkPoolRepository linkRepo;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.shortlink.baseUrl:https://health.networks.howard.edu}")
    private String baseUrl;

    /**
     * Generates a unique short code with collision handling.
     * Retries up to MAX_RETRIES times if collision occurs.
     *
     * @return A unique short code (e.g., "a7b3c9")
     * @throws IllegalStateException if unable to generate unique code after retries
     */
    public String generateUniqueShortCode() {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            String code = generateRandomCode();

            // Check if code already exists
            boolean exists = linkRepo.existsByShortCode(code);

            if (!exists) {
                log.debug("Generated unique short code: {} (attempt {})", code, attempt);
                return code;
            }

            log.warn("Short code collision detected: {} (attempt {}/{})", code, attempt, MAX_RETRIES);
        }

        // This should be extremely rare (probability: (1/62^6)^10)
        throw new IllegalStateException(
            "Failed to generate unique short code after " + MAX_RETRIES + " attempts. " +
            "This is extremely unlikely - please check database or increase code length."
        );
    }

    /**
     * Generates a random short code.
     */
    private String generateRandomCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            int index = random.nextInt(CHARACTERS.length());
            code.append(CHARACTERS.charAt(index));
        }
        return code.toString();
    }

    /**
     * Creates a full short URL from a short code.
     */
    public String buildShortUrl(String shortCode) {
        return baseUrl + "/s/" + shortCode;
    }

    /**
     * Generates a short code and builds the full short URL.
     * Convenience method that combines generation and URL building.
     *
     * @return Full short URL (e.g., "https://health.networks.howard.edu/s/a7b3c9")
     */
    public String createShortLink() {
        String shortCode = generateUniqueShortCode();
        return buildShortUrl(shortCode);
    }
}

