package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentStatusDto {
    private boolean isFull;
    private int currentCount;
    private Integer maxParticipants; // null means unlimited
    private boolean isEnrollmentActive;
    private int remainingSpots; // -1 if unlimited
    private String status; // "OPEN", "FULL", "DISABLED", "UNLIMITED"
}

