package edu.howard.research.smsbackend.models.dto;

import edu.howard.research.smsbackend.models.entities.GiftCardStatus;
import edu.howard.research.smsbackend.models.entities.GiftCardType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GiftCardDto {
    private UUID id;
    private UUID participantId;
    private String participantName;
    private String participantPhone;
    private String participantEmail;
    private UUID invitationId;
    private String surveyLinkUrl;
    private String cardCode;
    private GiftCardType cardType;
    private BigDecimal cardValue;
    private String redemptionUrl;
    private String redemptionInstructions;
    private GiftCardStatus status;
    private String sentBy;
    private OffsetDateTime sentAt;
    private OffsetDateTime deliveredAt;
    private OffsetDateTime redeemedAt;
    private OffsetDateTime expiresAt;
    private String notes;
    private String source;
    private UUID poolId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
