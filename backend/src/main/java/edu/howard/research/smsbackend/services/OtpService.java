package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.OtpCheckRequest;
import edu.howard.research.smsbackend.models.dto.OtpStartRequest;

import java.util.Map;

/**
 * Abstraction layer for OTP operations.
 */
public interface OtpService {
    Map<String, Object> start(OtpStartRequest req);
    /**
     * Verify OTP and create/update participant. If clientIp is non-null, it is stored as signup_ip.
     */
    Map<String, Object> check(OtpCheckRequest req, String clientIp);
}
