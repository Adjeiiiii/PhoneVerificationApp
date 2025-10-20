package edu.howard.research.smsbackend.models.dto;

import java.time.Instant;

public class ParticipantSummary {
    private String phone;
    private String status;
    private boolean subscribed;
    private Instant subscribedAt;

    public ParticipantSummary(String phone, String status, boolean subscribed, Instant subscribedAt) {
        this.phone = phone;
        this.status = status;
        this.subscribed = subscribed;
        this.subscribedAt = subscribedAt;
    }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isSubscribed() { return subscribed; }
    public void setSubscribed(boolean subscribed) { this.subscribed = subscribed; }

    public Instant getSubscribedAt() { return subscribedAt; }
    public void setSubscribedAt(Instant subscribedAt) { this.subscribedAt = subscribedAt; }
}
