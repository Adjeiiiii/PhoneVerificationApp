package edu.howard.research.smsbackend.models.dto;

import edu.howard.research.smsbackend.models.entities.GiftCardType;
import edu.howard.research.smsbackend.models.entities.PoolStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GiftCardPoolDto {
    private UUID id;
    private String cardCode;
    private GiftCardType cardType;
    private BigDecimal cardValue;
    private String redemptionUrl;
    private String redemptionInstructions;
    private PoolStatus status;
    private String batchLabel;
    private String uploadedBy;
    private OffsetDateTime uploadedAt;
    private OffsetDateTime expiresAt;
    private OffsetDateTime assignedAt;
    private UUID assignedToGiftCardId;
}
