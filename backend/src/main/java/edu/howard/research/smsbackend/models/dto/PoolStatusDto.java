package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PoolStatusDto {
    private long totalCards;
    private long availableCards;
    private long assignedCards;
    private long expiredCards;
    private long invalidCards;
    private Map<String, Long> cardsByType;
    private Map<String, Long> cardsByBatch;
}
