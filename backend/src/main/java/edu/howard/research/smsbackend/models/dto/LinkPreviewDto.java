package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LinkPreviewDto {
    private String link;
    private String status; // "found", "not_found", "duplicate", "already_completed"
    private String participantPhone;
    private String participantName;
    private String participantEmail;
    private Boolean isCompleted;
    private String message;
}
