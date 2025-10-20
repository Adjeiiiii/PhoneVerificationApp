package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class ParticipantVerifiedEvent {
    @NotNull
    private UUID participantId;

    public UUID getParticipantId() { return participantId; }
    public void setParticipantId(UUID participantId) { this.participantId = participantId; }
}