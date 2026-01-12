package edu.howard.research.smsbackend.config;

import edu.howard.research.smsbackend.services.GiftCardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled task to cleanup orphaned ASSIGNED pool cards
 * Runs daily at 2 AM
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GiftCardCleanupScheduler {

    private final GiftCardService giftCardService;

    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    public void cleanupOrphanedPoolCards() {
        log.info("Running scheduled cleanup of orphaned ASSIGNED pool cards");
        try {
            int cleanedCount = giftCardService.cleanupOrphanedAssignedPoolCards();
            log.info("Scheduled cleanup completed. Reset {} orphaned cards to AVAILABLE", cleanedCount);
        } catch (Exception e) {
            log.error("Error during scheduled cleanup of orphaned pool cards", e);
        }
    }
}

