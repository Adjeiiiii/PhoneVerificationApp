package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnsentGiftCardDto {
    private String cardCode;
    private String cardType;
    private BigDecimal cardValue;
    private String status;
    private String participantPhone;
    private String participantEmail;
    private String participantName;
    private String sentAt;
    private String sentBy;
    private String source;
    private String poolId;
    private String unsentBy;
    private OffsetDateTime unsentAt;
    private Map<String, Object> details;
}

