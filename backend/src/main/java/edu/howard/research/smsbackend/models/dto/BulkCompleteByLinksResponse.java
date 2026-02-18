package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkCompleteByLinksResponse {
    private int totalLinksInFile;
    private int newlyCompleted;
    private int alreadyCompleted;
    private int notFound;
    private int duplicatesInFile;
    private List<String> notFoundLinks;
    private List<String> duplicateLinks;
}
