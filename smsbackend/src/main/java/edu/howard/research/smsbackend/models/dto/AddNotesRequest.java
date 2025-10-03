package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddNotesRequest {
    
    @NotBlank(message = "Notes are required")
    private String notes;
}
