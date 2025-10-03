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

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddGiftCardRequest {
    
    @NotBlank(message = "Card code is required")
    private String cardCode;
    
    @NotNull(message = "Card type is required")
    private GiftCardType cardType;
    
    @NotNull(message = "Card value is required")
    @DecimalMin(value = "0.01", message = "Card value must be greater than 0")
    private BigDecimal cardValue;
    
    @NotBlank(message = "Redemption URL is required")
    private String redemptionUrl;
    
    private String redemptionInstructions;
    
    private String batchLabel;
    
    private OffsetDateTime expiresAt;
    
    private String notes;
}
