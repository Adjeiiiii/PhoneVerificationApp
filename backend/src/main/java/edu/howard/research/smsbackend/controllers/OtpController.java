package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.OtpCheckRequest;
import edu.howard.research.smsbackend.models.dto.OtpStartRequest;
import edu.howard.research.smsbackend.services.OtpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/otp")
@RequiredArgsConstructor
public class OtpController {

    private final OtpService otpService;

    /**
     * Start OTP flow for a phone number.
     * Side effects: create/refresh OTP challenge; send code (stub/Twilio).
     * Does NOT create invitations or claim survey links.
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> start(@Valid @RequestBody OtpStartRequest req) {
        Map<String, Object> result = otpService.start(req);
        return ResponseEntity.ok(result);
    }

    /**
     * Verify an OTP code for a phone number.
     * Side effects: mark participant as verified (e.g., phoneVerified=true, verifiedAt); store client IP as signup_ip.
     * IMPORTANT: Do NOT assign/send survey links here.
     * Link assignment/resend is handled separately (e.g., /api/admin/invitations/send).
     */
    @PostMapping("/check")
    public ResponseEntity<Map<String, Object>> check(@Valid @RequestBody OtpCheckRequest req, HttpServletRequest request) {
        String clientIp = getClientIp(request);
        Map<String, Object> result = otpService.check(req, clientIp);
        return ResponseEntity.ok(result);
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
