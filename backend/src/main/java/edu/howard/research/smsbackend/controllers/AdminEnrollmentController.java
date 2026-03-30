package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.EnrollmentAuditLogEntryDto;
import edu.howard.research.smsbackend.models.dto.EnrollmentConfigDto;
import edu.howard.research.smsbackend.models.dto.EnrollmentAccessRequest;
import edu.howard.research.smsbackend.models.dto.EnrollmentAccessResponse;
import edu.howard.research.smsbackend.models.dto.UpdateEnrollmentConfigRequest;
import edu.howard.research.smsbackend.security.JwtAuthenticationFilter;
import edu.howard.research.smsbackend.services.EnrollmentService;
import edu.howard.research.smsbackend.util.JwtUtil;
import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/enrollment")
@RequiredArgsConstructor
@Slf4j
public class AdminEnrollmentController {

    private final EnrollmentService enrollmentService;
    private final JwtUtil jwtUtil;

    @Value("${admin.enrollment.password-hash}")
    private String enrollmentPasswordHash;

    @Value("${admin.enrollment.password:}")
    private String enrollmentPasswordPlain;

    @Value("${admin.enrollment.access-token-expiration-ms:900000}")
    private long enrollmentAccessTokenExpirationMs;

    private static final String ENROLLMENT_SCOPE = "enrollment_access";
    private static final String ENROLLMENT_ACCESS_HEADER = "X-Enrollment-Access-Token";

    @PostConstruct
    public void initializeEnrollmentPasswordHash() {
        if (enrollmentPasswordHash != null && !enrollmentPasswordHash.isBlank()) {
            return;
        }
        if (enrollmentPasswordPlain != null && !enrollmentPasswordPlain.isBlank()) {
            enrollmentPasswordHash = BCrypt.hashpw(enrollmentPasswordPlain, BCrypt.gensalt());
            log.warn("Using plaintext enrollment password from environment; prefer ENROLLMENT_SETTINGS_PASSWORD_HASH in production.");
        }
    }

    @PostMapping("/access-token")
    public ResponseEntity<EnrollmentAccessResponse> createEnrollmentAccessToken(
            @Valid @RequestBody EnrollmentAccessRequest request
    ) {
        if (enrollmentPasswordHash == null || enrollmentPasswordHash.isBlank()) {
            log.error("Enrollment password hash is not configured");
            return ResponseEntity.internalServerError()
                    .body(EnrollmentAccessResponse.failure("Enrollment access is not configured on the server."));
        }

        if (!BCrypt.checkpw(request.getPassword(), enrollmentPasswordHash)) {
            return ResponseEntity.badRequest()
                    .body(EnrollmentAccessResponse.failure("Invalid enrollment settings password."));
        }

        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        String token = jwtUtil.generateScopedToken(adminUsername, ENROLLMENT_SCOPE, enrollmentAccessTokenExpirationMs);
        long expiresInSeconds = Math.max(1, enrollmentAccessTokenExpirationMs / 1000);

        return ResponseEntity.ok(EnrollmentAccessResponse.success(token, expiresInSeconds));
    }

    private ResponseEntity<Map<String, String>> unauthorizedEnrollmentAccess() {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "enrollment_access_denied",
                "message", "Enrollment settings access token is missing, invalid, or expired."
        ));
    }

    private boolean hasValidEnrollmentAccessToken(String token) {
        return token != null && !token.isBlank() && jwtUtil.validateScopedToken(token, ENROLLMENT_SCOPE);
    }

    /**
     * Get enrollment configuration (admin only)
     */
    @GetMapping("/config")
    public ResponseEntity<?> getEnrollmentConfig(
            @RequestHeader(value = ENROLLMENT_ACCESS_HEADER, required = false) String enrollmentAccessToken
    ) {
        if (!hasValidEnrollmentAccessToken(enrollmentAccessToken)) {
            return unauthorizedEnrollmentAccess();
        }
        EnrollmentConfigDto config = enrollmentService.getEnrollmentConfig();
        return ResponseEntity.ok(config);
    }

    /**
     * Update enrollment configuration (admin only)
     */
    @PutMapping("/config")
    public ResponseEntity<?> updateEnrollmentConfig(
            @RequestHeader(value = ENROLLMENT_ACCESS_HEADER, required = false) String enrollmentAccessToken,
            @Valid @RequestBody UpdateEnrollmentConfigRequest request
    ) {
        if (!hasValidEnrollmentAccessToken(enrollmentAccessToken)) {
            return unauthorizedEnrollmentAccess();
        }
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        EnrollmentConfigDto config = enrollmentService.updateEnrollmentConfig(request, adminUsername);
        return ResponseEntity.ok(config);
    }

    /**
     * Recent enrollment settings changes (admin + enrollment access token).
     */
    @GetMapping("/audit-log")
    public ResponseEntity<?> getEnrollmentAuditLog(
            @RequestHeader(value = ENROLLMENT_ACCESS_HEADER, required = false) String enrollmentAccessToken,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        if (!hasValidEnrollmentAccessToken(enrollmentAccessToken)) {
            return unauthorizedEnrollmentAccess();
        }
        Pageable pageable = PageRequest.of(page, Math.min(Math.max(size, 1), 100));
        Page<EnrollmentAuditLogEntryDto> logs = enrollmentService.listEnrollmentAuditLog(pageable);
        return ResponseEntity.ok(logs);
    }
}




