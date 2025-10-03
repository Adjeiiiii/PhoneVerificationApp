package edu.howard.research.smsbackend.models.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "gift_cards",
        indexes = {
                @Index(name = "idx_gift_cards_participant", columnList = "participant_id"),
                @Index(name = "idx_gift_cards_invitation", columnList = "invitation_id"),
                @Index(name = "idx_gift_cards_status", columnList = "status"),
                @Index(name = "idx_gift_cards_sent_by", columnList = "sent_by"),
                @Index(name = "idx_gift_cards_created_at", columnList = "created_at")
        }
)
public class GiftCard {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "participant_id", nullable = false)
    private Participant participant;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "invitation_id", nullable = false)
    private SurveyInvitation invitation;

    @Column(name = "card_code", nullable = false, length = 100)
    private String cardCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "card_type", nullable = false, length = 32)
    private GiftCardType cardType;

    @Column(name = "card_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal cardValue;

    @Column(name = "redemption_url", nullable = false, length = 500)
    private String redemptionUrl;

    @Column(name = "redemption_instructions", length = 1000)
    private String redemptionInstructions;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private GiftCardStatus status = GiftCardStatus.PENDING;

    @Column(name = "sent_by", length = 100)
    private String sentBy;

    @Column(name = "sent_at")
    private OffsetDateTime sentAt;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "redeemed_at")
    private OffsetDateTime redeemedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "source", length = 20, nullable = false)
    private String source = "MANUAL"; // "POOL" or "MANUAL"

    @Column(name = "pool_id", columnDefinition = "uuid")
    private UUID poolId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    // Getters & setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Participant getParticipant() { return participant; }
    public void setParticipant(Participant participant) { this.participant = participant; }

    public SurveyInvitation getInvitation() { return invitation; }
    public void setInvitation(SurveyInvitation invitation) { this.invitation = invitation; }

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

    public GiftCardStatus getStatus() { return status; }
    public void setStatus(GiftCardStatus status) { this.status = status; }

    public String getSentBy() { return sentBy; }
    public void setSentBy(String sentBy) { this.sentBy = sentBy; }

    public OffsetDateTime getSentAt() { return sentAt; }
    public void setSentAt(OffsetDateTime sentAt) { this.sentAt = sentAt; }

    public OffsetDateTime getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(OffsetDateTime deliveredAt) { this.deliveredAt = deliveredAt; }

    public OffsetDateTime getRedeemedAt() { return redeemedAt; }
    public void setRedeemedAt(OffsetDateTime redeemedAt) { this.redeemedAt = redeemedAt; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public UUID getPoolId() { return poolId; }
    public void setPoolId(UUID poolId) { this.poolId = poolId; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
