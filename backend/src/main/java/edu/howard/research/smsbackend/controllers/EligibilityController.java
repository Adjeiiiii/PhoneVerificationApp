package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * Public endpoint to check if the user can proceed past eligibility screening.
 * Blocks duplicate signups from the same IP for 1 week.
 */
@RestController
@RequestMapping("/api/eligibility")
@RequiredArgsConstructor
@Slf4j
public class EligibilityController {

    private static final int BLOCK_DAYS = 7;

    private final ParticipantRepository participantRepo;

    /**
     * Check if the client's IP is allowed to proceed past eligibility (to contact/phone step).
     * Called when user clicks Next on the eligibility screen.
     */
    @PostMapping("/check-ip")
    public ResponseEntity<Map<String, Object>> checkCanProceed(HttpServletRequest request) {
        String clientIp = getClientIp(request);

        if (clientIp == null || clientIp.isBlank()) {
            log.debug("Eligibility IP check: no client IP, allowing");
            return ResponseEntity.ok(Map.of("allowed", true));
        }

        String ip = clientIp.trim();
        Optional<OffsetDateTime> latestSignup = participantRepo.findLatestSignupAtByIp(ip);

        log.info("Eligibility IP check: clientIp={}, latestSignup={}", ip, latestSignup.orElse(null));

        if (latestSignup.isEmpty()) {
            return ResponseEntity.ok(Map.of("allowed", true));
        }

        OffsetDateTime cutoff = OffsetDateTime.now().minusDays(BLOCK_DAYS);
        OffsetDateTime lastSignup = latestSignup.get();
        if (lastSignup.isBefore(cutoff) || lastSignup.equals(cutoff)) {
            log.debug("Eligibility IP check: last signup {} is before cutoff {}, allowing", lastSignup, cutoff);
            return ResponseEntity.ok(Map.of("allowed", true));
        }

        OffsetDateTime unblockAt = latestSignup.get().plusDays(BLOCK_DAYS);
        String unblockDate = unblockAt.format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));
        String message = String.format(
                "This IP address was recently used to complete signup. To prevent duplicate registrations, " +
                "we limit new signups from the same network for 1 week. You can try again after %s, " +
                "or contact us at ai@networks.howard.edu or (240) 428-8442 if you believe this is an error.",
                unblockDate
        );

        log.info("Blocking duplicate signup from IP {} (last signup: {}, unblock: {})", ip, latestSignup.get(), unblockAt);

        return ResponseEntity.ok(Map.of(
                "allowed", false,
                "error", "ip_blocked",
                "message", message,
                "unblock_at", unblockAt.toString()
        ));
    }

    private static String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            String first = xff.split(",")[0].trim();
            if (!first.isBlank()) return first;
        }
        String xri = request.getHeader("X-Real-IP");
        if (xri != null && !xri.isBlank()) return xri.trim();
        String remote = request.getRemoteAddr();
        return remote != null ? remote : "";
    }
}
