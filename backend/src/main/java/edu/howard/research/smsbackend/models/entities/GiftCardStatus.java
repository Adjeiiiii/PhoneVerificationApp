package edu.howard.research.smsbackend.models.entities;

public enum GiftCardStatus {
    PENDING,    // Created but not sent yet
    SENT,       // Sent to participant
    DELIVERED,  // Confirmed delivered via email/SMS
    REDEEMED,   // Participant has redeemed the gift card
    EXPIRED,    // Gift card has expired
    FAILED,     // Failed to send or deliver
    UNSENT      // Gift card was unsent/revoked by admin
}
