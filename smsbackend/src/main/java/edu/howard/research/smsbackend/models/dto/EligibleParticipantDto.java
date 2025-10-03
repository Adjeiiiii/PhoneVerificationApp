package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EligibleParticipantDto {
    private UUID participantId;
    private String participantName;
    private String participantPhone;
    private String participantEmail;
    private UUID invitationId;
    private String surveyLinkUrl;
    private OffsetDateTime surveyCompletedAt;
    private OffsetDateTime participantVerifiedAt;
}
