package edu.howard.research.smsbackend.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkCompleteByLinksRequest {
    private List<String> links;
}
