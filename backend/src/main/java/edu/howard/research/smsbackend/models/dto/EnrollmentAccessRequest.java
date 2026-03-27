package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EnrollmentAccessRequest {
    @NotBlank(message = "Password is required")
    private String password;
}
