package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentAuditLogEntryDto {
    private UUID id;
    private OffsetDateTime createdAt;
    private String actorUsername;
    private String summary;
}
