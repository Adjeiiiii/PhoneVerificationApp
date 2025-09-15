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
@Table(name = "sms_event_log", indexes = {
        @Index(name = "idx_sms_event_log_sid",   columnList = "message_sid"),
        @Index(name = "idx_sms_event_log_event", columnList = "event_type"),
        @Index(name = "idx_sms_event_log_time",  columnList = "created_at")
})
public class SmsEventLog {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id")
    private SurveyInvitation invitation;

    @Column(name = "message_sid")
    private String messageSid;

    @Column(name = "event_type", nullable = false)
    private String eventType; // queued | sent | delivered | failed | inbound

    @JdbcTypeCode(SqlTypes.JSON)   // <-- tell Hibernate this is JSON
    @Column(name = "payload", columnDefinition = "jsonb")
    private Map<String, Object> payload; // or JsonNode if you prefer

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // --- getters and setters ---
    public UUID getId() { return id; }

    public SurveyInvitation getInvitation() { return invitation; }
    public void setInvitation(SurveyInvitation invitation) { this.invitation = invitation; }

    public String getMessageSid() { return messageSid; }
    public void setMessageSid(String messageSid) { this.messageSid = messageSid; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public Map<String, Object> getPayload() { return payload; }
    public void setPayload(Map<String, Object> payload) { this.payload = payload; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
