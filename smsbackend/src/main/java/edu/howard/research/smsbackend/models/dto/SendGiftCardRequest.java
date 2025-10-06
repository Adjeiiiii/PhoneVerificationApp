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
    
    @NotNull(message = "Card type is required")
    private GiftCardType cardType;
    
    @NotNull(message = "Card value is required")
    @DecimalMin(value = "0.01", message = "Card value must be greater than 0")
    private BigDecimal cardValue;
    
    @NotBlank(message = "Card code is required")
    private String cardCode;
    
    @NotBlank(message = "Redemption URL is required")
    private String redemptionUrl;
    
    private String redemptionInstructions;
    
    private OffsetDateTime expiresAt;
    
    private String notes;
    
    private String deliveryMethod; // "EMAIL", "SMS", "BOTH"
    
    private String source = "MANUAL"; // "POOL" or "MANUAL"
    
    private UUID poolId; // if source is "POOL"
}
