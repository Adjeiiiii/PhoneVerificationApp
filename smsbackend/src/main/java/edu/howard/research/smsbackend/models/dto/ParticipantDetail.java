package edu.howard.research.smsbackend.models.dto;

import java.time.Instant;

public class ParticipantDetail {
    private String phone;
    private String status;        // "subscribed" | "opted_out"
    private boolean verified;
    private Instant consentAt;    // nullable
    private Instant optedOutAt;   // nullable

    public ParticipantDetail(String phone, String status, boolean verified, Instant consentAt, Instant optedOutAt) {
        this.phone = phone;
        this.status = status;
        this.verified = verified;
        this.consentAt = consentAt;
        this.optedOutAt = optedOutAt;
    }

    public String getPhone() { return phone; }
    public String getStatus() { return status; }
    public boolean isVerified() { return verified; }
    public Instant getConsentAt() { return consentAt; }
    public Instant getOptedOutAt() { return optedOutAt; }
}
