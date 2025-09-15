package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.OtpCheckRequest;
import edu.howard.research.smsbackend.models.dto.OtpStartRequest;

import java.util.Map;

/**
 * Abstraction layer for OTP operations.
 */
public interface OtpService {
    Map<String, Object> start(OtpStartRequest req);
    Map<String, Object> check(OtpCheckRequest req);
}
