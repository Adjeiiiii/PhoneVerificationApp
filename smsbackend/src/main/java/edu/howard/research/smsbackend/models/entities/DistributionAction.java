package edu.howard.research.smsbackend.models.entities;

public enum DistributionAction {
    CREATED,           // Gift card created
    EMAIL_SENT,        // Email sent to participant
    SMS_SENT,          // SMS sent to participant
    EMAIL_DELIVERED,   // Email delivery confirmed
    SMS_DELIVERED,     // SMS delivery confirmed
    EMAIL_FAILED,      // Email delivery failed
    SMS_FAILED,        // SMS delivery failed
    LINK_CLICKED,      // Redemption link clicked
    REDEEMED,          // Gift card redeemed
    EXPIRED,           // Gift card expired
    ADMIN_NOTES,       // Admin added notes
    RESENT,            // Gift card resent
    STATUS_UPDATED,    // Status manually updated
    UNSENT             // Gift card unsent/revoked by admin (after being sent)
}
