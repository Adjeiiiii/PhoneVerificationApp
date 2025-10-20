package edu.howard.research.smsbackend.models.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(
        name = "gift_card_distribution_logs",
        indexes = {
                @Index(name = "idx_gift_card_logs_gift_card", columnList = "gift_card_id"),
                @Index(name = "idx_gift_card_logs_action", columnList = "action"),
                @Index(name = "idx_gift_card_logs_performed_by", columnList = "performed_by"),
                @Index(name = "idx_gift_card_logs_created_at", columnList = "created_at")
        }
)
public class GiftCardDistributionLog {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gift_card_id", nullable = false)
    private GiftCard giftCard;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 32)
    private DistributionAction action;

    @Column(name = "performed_by", length = 100, nullable = false)
    private String performedBy; // admin username or "SYSTEM"

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb")
    private Map<String, Object> details; // additional context

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // Getters & setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public GiftCard getGiftCard() { return giftCard; }
    public void setGiftCard(GiftCard giftCard) { this.giftCard = giftCard; }

    public DistributionAction getAction() { return action; }
    public void setAction(DistributionAction action) { this.action = action; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public Map<String, Object> getDetails() { return details; }
    public void setDetails(Map<String, Object> details) { this.details = details; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
