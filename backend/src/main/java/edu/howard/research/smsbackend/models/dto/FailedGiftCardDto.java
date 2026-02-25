package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FailedGiftCardDto {
    private UUID giftCardId;
    private UUID participantId;
    private String participantName;
    private String participantPhone;
    private String participantEmail;
    private UUID invitationId;
    private String surveyLinkUrl;
    private OffsetDateTime surveyCompletedAt;
    /** When the send failed (e.g. gift card updatedAt or sentAt). */
    private OffsetDateTime failedAt;
    /** Human-readable reason from distribution log if available (e.g. email/SMS error). */
    private String failureReason;
}
