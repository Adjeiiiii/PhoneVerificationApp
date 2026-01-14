package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.EnrollmentConfigDto;
import edu.howard.research.smsbackend.models.dto.EnrollmentStatusDto;
import edu.howard.research.smsbackend.models.dto.UpdateEnrollmentConfigRequest;

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
     * Check if enrollment is full (for internal use)
     */
    boolean isEnrollmentFull();
}

