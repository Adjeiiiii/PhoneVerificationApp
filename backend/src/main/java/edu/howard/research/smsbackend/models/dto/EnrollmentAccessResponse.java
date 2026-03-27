package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EnrollmentAccessResponse {
    private boolean success;
    private String token;
    private long expiresInSeconds;
    private String message;

    public static EnrollmentAccessResponse success(String token, long expiresInSeconds) {
        return new EnrollmentAccessResponse(true, token, expiresInSeconds, "Access granted");
    }

    public static EnrollmentAccessResponse failure(String message) {
        return new EnrollmentAccessResponse(false, null, 0, message);
    }
}
