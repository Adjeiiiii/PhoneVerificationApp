package edu.howard.research.smsbackend.models.dto;

import edu.howard.research.smsbackend.models.entities.GiftCardType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendGiftCardRequest {
    
    @NotNull(message = "Invitation ID is required")
    private UUID invitationId;
    
    // Optional - will be auto-selected from pool if not provided
    private GiftCardType cardType;
    
    // Optional - will be auto-selected from pool if not provided
    private BigDecimal cardValue;
    
    // Optional - will be auto-selected from pool if not provided
    private String cardCode;
    
    // Optional - will be auto-selected from pool if not provided
    private String redemptionUrl;
    
    private String redemptionInstructions;
    
    private OffsetDateTime expiresAt;
    
    private String notes;
    
    @NotBlank(message = "Delivery method is required")
    private String deliveryMethod; // "EMAIL", "SMS", "BOTH"
    
    // Deprecated - cards are now always selected from pool automatically
    @Deprecated
    private String source = "POOL";
    
    // Deprecated - pool card is now selected automatically
    @Deprecated
    private UUID poolId;
}
