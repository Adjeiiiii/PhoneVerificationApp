package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SurveyAccessResponse {
    private boolean success;
    private String token;
    private long expiresInSeconds;
    private String message;

    public static SurveyAccessResponse success(String token, long expiresInSeconds) {
        return new SurveyAccessResponse(true, token, expiresInSeconds, "Access granted");
    }

    public static SurveyAccessResponse failure(String message) {
        return new SurveyAccessResponse(false, null, 0, message);
    }
}
