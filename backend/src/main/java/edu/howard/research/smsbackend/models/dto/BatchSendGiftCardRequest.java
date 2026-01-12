package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchSendGiftCardRequest {
    
    @NotEmpty(message = "At least one participant is required")
    @Valid
    private List<ParticipantInvitationPair> participants;
    
    @NotBlank(message = "Delivery method is required")
    private String deliveryMethod; // "EMAIL", "SMS", "BOTH"
    
    private String notes;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParticipantInvitationPair {
        @jakarta.validation.constraints.NotNull(message = "Participant ID is required")
        private UUID participantId;
        
        @jakarta.validation.constraints.NotNull(message = "Invitation ID is required")
        private UUID invitationId;
    }
}

