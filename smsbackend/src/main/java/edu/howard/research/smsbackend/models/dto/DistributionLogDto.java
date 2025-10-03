package edu.howard.research.smsbackend.models.dto;

import edu.howard.research.smsbackend.models.entities.DistributionAction;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DistributionLogDto {
    private UUID id;
    private UUID giftCardId;
    private DistributionAction action;
    private String performedBy;
    private Map<String, Object> details;
    private OffsetDateTime createdAt;
}
