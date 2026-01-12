package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailSendResult {
    private boolean success;
    private String errorMessage;
    private Integer statusCode;
    private String responseBody;
    
    public static EmailSendResult success() {
        return new EmailSendResult(true, null, null, null);
    }
    
    public static EmailSendResult failure(String errorMessage) {
        return new EmailSendResult(false, errorMessage, null, null);
    }
    
    public static EmailSendResult failure(String errorMessage, Integer statusCode, String responseBody) {
        return new EmailSendResult(false, errorMessage, statusCode, responseBody);
    }
}

