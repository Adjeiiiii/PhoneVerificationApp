package edu.howard.research.smsbackend.models.entities;

import edu.howard.research.smsbackend.models.entities.LinkStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "survey_link_pool",
        indexes = {
                @Index(name = "idx_linkpool_status", columnList = "status"),
                @Index(name = "idx_linkpool_batch",  columnList = "batch_label")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_linkpool_link_url", columnNames = "link_url")
        }
)
public class SurveyLinkPool {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID id;

    @Column(name = "batch_label")
    private String batchLabel;

    @Column(name = "link_url", nullable = false)
    private String linkUrl;

    @Column(name = "notes")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private LinkStatus status = LinkStatus.AVAILABLE;

    @Column(name = "uploaded_by")
    private String uploadedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private OffsetDateTime uploadedAt;

    @Column(name = "reserved_at")
    private OffsetDateTime reservedAt;

    @Column(name = "reserved_until")
    private OffsetDateTime reservedUntil;

    @Column(name = "reserved_by")
    private String reservedBy;

    // Getters & setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getBatchLabel() { return batchLabel; }
    public void setBatchLabel(String batchLabel) { this.batchLabel = batchLabel; }

    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LinkStatus getStatus() { return status; }
    public void setStatus(LinkStatus status) { this.status = status; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public OffsetDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(OffsetDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public OffsetDateTime getReservedAt() { return reservedAt; }
    public void setReservedAt(OffsetDateTime reservedAt) { this.reservedAt = reservedAt; }

    public OffsetDateTime getReservedUntil() { return reservedUntil; }
    public void setReservedUntil(OffsetDateTime reservedUntil) { this.reservedUntil = reservedUntil; }

    public String getReservedBy() { return reservedBy; }
    public void setReservedBy(String reservedBy) { this.reservedBy = reservedBy; }
}
