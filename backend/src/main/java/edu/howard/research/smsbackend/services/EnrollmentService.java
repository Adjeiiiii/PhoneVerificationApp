package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.EnrollmentAuditLogEntryDto;
import edu.howard.research.smsbackend.models.dto.EnrollmentConfigDto;
import edu.howard.research.smsbackend.models.dto.EnrollmentStatusDto;
import edu.howard.research.smsbackend.models.dto.UpdateEnrollmentConfigRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EnrollmentService {
    /**
     * Get current enrollment status (public endpoint)
     */
    EnrollmentStatusDto getEnrollmentStatus();

    /**
     * Get enrollment configuration (admin only)
     */
    EnrollmentConfigDto getEnrollmentConfig();

    /**
     * Update enrollment configuration (admin only)
     */
    EnrollmentConfigDto updateEnrollmentConfig(UpdateEnrollmentConfigRequest request, String adminUsername);

    /**
     * Paginated audit log of enrollment settings changes (admin only).
     */
    Page<EnrollmentAuditLogEntryDto> listEnrollmentAuditLog(Pageable pageable);

    /**
     * Check if enrollment is full (for internal use)
     */
    boolean isEnrollmentFull();

    /**
     * Validate a participant survey access token.
     */
    boolean isValidSurveyAccessToken(String token);

    /**
     * Issue a participant survey access token if password is valid.
     */
    String createSurveyAccessToken(String password);
}




