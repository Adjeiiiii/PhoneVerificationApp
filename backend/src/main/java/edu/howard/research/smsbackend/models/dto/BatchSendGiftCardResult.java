package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchSendGiftCardResult {
    private int totalRequested;
    private int successful;
    private int failed;
    private List<SuccessResult> successes = new ArrayList<>();
    private List<FailureResult> failures = new ArrayList<>();
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SuccessResult {
        private UUID participantId;
        private UUID invitationId;
        private UUID giftCardId;
        private String participantPhone;
        private String participantEmail;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailureResult {
        private UUID participantId;
        private UUID invitationId;
        private String participantPhone;
        private String participantEmail;
        private String errorMessage;
    }
}

