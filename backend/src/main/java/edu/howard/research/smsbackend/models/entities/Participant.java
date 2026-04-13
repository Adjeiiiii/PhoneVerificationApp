package edu.howard.research.smsbackend.models.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "participant",
        indexes = {
                @Index(name = "idx_participant_phone", columnList = "phone")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_participant_phone", columnNames = "phone")
        }
)
public class Participant {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID id;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "name")
    private String name;

    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;

    @Column(name = "consent_at")
    private OffsetDateTime consentAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private ParticipantStatus status = ParticipantStatus.SUBSCRIBED;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    @Column(name = "signup_ip", length = 45)
    private String signupIp;

    /**
     * Unique six-digit numeric id for new signups ({@code 000000}–{@code 999999}); appended as {@code &uid=} on survey links.
     * Legacy rows may still hold a UUID string from an earlier release. Null for participants created before this feature.
     */
    @Column(name = "link_public_uid", length = 36, unique = true)
    private String linkPublicUid;

    // Getters & setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public boolean isPhoneVerified() { return phoneVerified; }
    public void setPhoneVerified(boolean phoneVerified) { this.phoneVerified = phoneVerified; }

    public OffsetDateTime getConsentAt() { return consentAt; }
    public void setConsentAt(OffsetDateTime consentAt) { this.consentAt = consentAt; }

    public ParticipantStatus getStatus() { return status; }
    public void setStatus(ParticipantStatus status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(OffsetDateTime verifiedAt) { this.verifiedAt = verifiedAt; }

    public String getSignupIp() { return signupIp; }
    public void setSignupIp(String signupIp) { this.signupIp = signupIp; }

    public String getLinkPublicUid() { return linkPublicUid; }
    public void setLinkPublicUid(String linkPublicUid) { this.linkPublicUid = linkPublicUid; }
}
