package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminLoginResponse {
    private boolean success;
    private String token;
    private String message;
    
    public static AdminLoginResponse success(String token) {
        return new AdminLoginResponse(true, token, "Login successful");
    }
    
    public static AdminLoginResponse failure(String message) {
        return new AdminLoginResponse(false, null, message);
    }
}
