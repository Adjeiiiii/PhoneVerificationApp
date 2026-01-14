package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateEnrollmentConfigRequest {
    @Min(value = 1, message = "Maximum participants must be at least 1, or null for unlimited")
    private Integer maxParticipants; // null means unlimited
    
    private Boolean isEnrollmentActive;
}

