package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public class LinkUploadRequest {
    private String batchLabel;
    private String uploadedBy;
    private String notes;

    @NotNull
    private List<String> links;

    public String getBatchLabel() { return batchLabel; }
    public void setBatchLabel(String batchLabel) { this.batchLabel = batchLabel; }
    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public List<String> getLinks() { return links; }
    public void setLinks(List<String> links) { this.links = links; }
}
