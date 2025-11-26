package edu.howard.research.smsbackend.services;

import com.twilio.exception.ApiException;
import com.twilio.rest.lookups.v2.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service for validating phone numbers using Twilio Lookup API.
 * Detects VOIP numbers and other line types to ensure only carrier numbers are accepted.
 */
@Slf4j
@Service
public class PhoneValidationService {

    /**
     * Validates that a phone number is not a VOIP number.
     * Uses Twilio Lookup API v2 with Line Type Intelligence.
     * 
     * @param phoneNumber Phone number in E.164 format (e.g., +12025550123)
     * @return ValidationResult with isValid flag and error message if invalid
     */
    public ValidationResult validatePhoneNumber(String phoneNumber) {
        try {
            // Fetch phone number information with line type intelligence
            // Using Twilio Lookup API v2 - must explicitly request line_type_intelligence field
            PhoneNumber phoneNumberInfo = PhoneNumber.fetcher(phoneNumber)
                    .setFields("line_type_intelligence")
                    .fetch();

            // Get line type intelligence data as a Map
            // The SDK returns it as a Map<String, Object>
            Map<String, Object> lineTypeIntelligence = phoneNumberInfo.getLineTypeIntelligence();
            
            if (lineTypeIntelligence == null || lineTypeIntelligence.isEmpty()) {
                log.warn("Line type intelligence not available for phone: {}", phoneNumber);
                // If we can't determine line type, allow it (fail open for now)
                // You might want to change this to fail closed depending on your requirements
                return ValidationResult.valid();
            }

            // Extract the line type from the map
            Object typeObj = lineTypeIntelligence.get("type");
            String lineType = typeObj != null ? typeObj.toString() : null;

            if (lineType == null || lineType.isEmpty()) {
                log.warn("Line type is null or empty for phone: {}", phoneNumber);
                return ValidationResult.valid();
            }

            log.info("Phone {} has line type: {}", phoneNumber, lineType);

            // Reject VOIP and non-fixed VOIP numbers
            if ("voip".equalsIgnoreCase(lineType) || 
                "nonFixedVoip".equalsIgnoreCase(lineType)) {
                String errorMessage = "Only mobile and landline numbers are accepted. " +
                        "VOIP numbers cannot be used for verification. " +
                        "Please use a phone number from a mobile carrier or landline service.";
                log.warn("Rejected VOIP number: {} (type: {})", phoneNumber, lineType);
                return ValidationResult.invalid(errorMessage);
            }

            // Accept mobile and landline numbers
            if ("mobile".equalsIgnoreCase(lineType) || 
                "landline".equalsIgnoreCase(lineType)) {
                log.info("Accepted {} number: {}", lineType, phoneNumber);
                return ValidationResult.valid();
            }

            // For unknown types, log and allow (you may want to change this)
            log.warn("Unknown line type '{}' for phone: {}. Allowing for now.", lineType, phoneNumber);
            return ValidationResult.valid();

        } catch (ApiException e) {
            log.error("Twilio Lookup API error for phone {}: code={}, message={}", 
                    phoneNumber, e.getCode(), e.getMessage());
            
            // If lookup fails, we have a few options:
            // 1. Fail closed (reject) - more secure but might block valid numbers
            // 2. Fail open (allow) - less secure but better UX
            // For now, we'll fail open with a warning
            // You can change this based on your security requirements
            log.warn("Allowing phone {} due to lookup API error (failing open)", phoneNumber);
            return ValidationResult.valid();
        } catch (Exception e) {
            log.error("Unexpected error validating phone {}: {}", phoneNumber, e.getMessage(), e);
            // Fail open on unexpected errors
            return ValidationResult.valid();
        }
    }

    /**
     * Result of phone number validation
     */
    public static class ValidationResult {
        private final boolean valid;
        private final String errorMessage;

        private ValidationResult(boolean valid, String errorMessage) {
            this.valid = valid;
            this.errorMessage = errorMessage;
        }

        public static ValidationResult valid() {
            return new ValidationResult(true, null);
        }

        public static ValidationResult invalid(String errorMessage) {
            return new ValidationResult(false, errorMessage);
        }

        public boolean isValid() {
            return valid;
        }

        public String getErrorMessage() {
            return errorMessage;
        }
    }
}

