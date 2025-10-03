package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UploadResultDto {
    private int totalRows;
    private int successfulUploads;
    private int failedUploads;
    private List<String> errors;
    private String batchLabel;
    private String uploadedBy;
}
