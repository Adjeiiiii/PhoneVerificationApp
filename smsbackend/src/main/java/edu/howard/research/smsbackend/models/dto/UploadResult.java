package edu.howard.research.smsbackend.models.dto;

import java.util.List;

public record UploadResult(int received, int inserted, List<String> duplicates) {}
