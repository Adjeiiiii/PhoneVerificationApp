package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.repositories.SurveyLinkPoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * Controller for handling short link redirects.
 * Handles requests to /s/{shortCode} and redirects to the original URL.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class ShortLinkController {

    private final SurveyLinkPoolRepository linkRepo;

    /**
     * Redirects a short code to the original URL.
     * 
     * @param shortCode The short code (e.g., "a7b3c9")
     * @return HTTP 302 redirect to the original URL, or 404 if not found
     */
    @GetMapping("/s/{shortCode}")
    public ResponseEntity<Void> redirect(@PathVariable String shortCode) {
        log.debug("Short link redirect requested for code: {}", shortCode);

        // Look up the short code in the database
        var linkOpt = linkRepo.findByShortCode(shortCode);

        if (linkOpt.isEmpty()) {
            log.warn("Short code not found: {}", shortCode);
            return ResponseEntity.notFound().build();
        }

        var link = linkOpt.get();
        String originalUrl = link.getLinkUrl();

        if (originalUrl == null || originalUrl.isBlank()) {
            log.error("Link found but original URL is null or blank for code: {}", shortCode);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        log.info("Redirecting short code {} to: {}", shortCode, originalUrl);

        // Return HTTP 302 redirect
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(originalUrl))
                .build();
    }
}

