package edu.howard.research.smsbackend.models.entities;

public enum PoolStatus {
    AVAILABLE,  // Available for assignment
    ASSIGNED,   // Assigned to a gift card
    EXPIRED,    // Gift card has expired
    INVALID,    // Invalid or duplicate code
    /** Custom workflow state; use {@code customStatusLabel} for the description (required). Not auto-assigned. */
    OTHER
}
