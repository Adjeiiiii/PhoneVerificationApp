package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGiftCardRequest {
    
    @NotBlank(message = "Card code is required")
    @Pattern(regexp = "^[A-Z0-9]{4}-[A-Z0-9]{6}-[A-Z0-9]{4}$", 
             message = "Card code must be in format XXXX-XXXXXX-XXXX", 
             flags = Pattern.Flag.CASE_INSENSITIVE)
    private String cardCode;
}

