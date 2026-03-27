package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SurveyAccessRequest {
    @NotBlank(message = "Password is required")
    private String password;
}
