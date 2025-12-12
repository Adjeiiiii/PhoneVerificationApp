package edu.howard.research.smsbackend.models.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "gift_card_pool",
        indexes = {
                @Index(name = "idx_gift_card_pool_status", columnList = "status"),
                @Index(name = "idx_gift_card_pool_batch", columnList = "batch_label"),
                @Index(name = "idx_gift_card_pool_type", columnList = "card_type")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_gift_card_pool_code", columnNames = "card_code")
        }
)
public class GiftCardPool {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID id;

    @Column(name = "card_code", nullable = false, unique = true)
    private String cardCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", length = 32)
    private GiftCardType cardType;  // Optional - defaults to null (assumed Amazon)

    @Column(name = "card_value", precision = 10, scale = 2)
    private BigDecimal cardValue;  // Optional - amount may not be known

    @Column(name = "redemption_url", length = 500)
    private String redemptionUrl;  // Optional - defaults to Amazon redemption URL in code

    @Column(name = "redemption_instructions", length = 1000)
    private String redemptionInstructions;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private PoolStatus status = PoolStatus.AVAILABLE;

    @Column(name = "batch_label", length = 100)
    private String batchLabel;

    @Column(name = "uploaded_by", length = 100)
    private String uploadedBy;

    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private OffsetDateTime uploadedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "assigned_at")
    private OffsetDateTime assignedAt;

    @Column(name = "assigned_to_gift_card_id", columnDefinition = "uuid")
    private UUID assignedToGiftCardId;

    // Getters & setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCardCode() { return cardCode; }
    public void setCardCode(String cardCode) { this.cardCode = cardCode; }

    public GiftCardType getCardType() { return cardType; }
    public void setCardType(GiftCardType cardType) { this.cardType = cardType; }

    public BigDecimal getCardValue() { return cardValue; }
    public void setCardValue(BigDecimal cardValue) { this.cardValue = cardValue; }

    public String getRedemptionUrl() { return redemptionUrl; }
    public void setRedemptionUrl(String redemptionUrl) { this.redemptionUrl = redemptionUrl; }

    public String getRedemptionInstructions() { return redemptionInstructions; }
    public void setRedemptionInstructions(String redemptionInstructions) { this.redemptionInstructions = redemptionInstructions; }

    public PoolStatus getStatus() { return status; }
    public void setStatus(PoolStatus status) { this.status = status; }

    public String getBatchLabel() { return batchLabel; }
    public void setBatchLabel(String batchLabel) { this.batchLabel = batchLabel; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public OffsetDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(OffsetDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }

    public OffsetDateTime getAssignedAt() { return assignedAt; }
    public void setAssignedAt(OffsetDateTime assignedAt) { this.assignedAt = assignedAt; }

    public UUID getAssignedToGiftCardId() { return assignedToGiftCardId; }
    public void setAssignedToGiftCardId(UUID assignedToGiftCardId) { this.assignedToGiftCardId = assignedToGiftCardId; }
}
