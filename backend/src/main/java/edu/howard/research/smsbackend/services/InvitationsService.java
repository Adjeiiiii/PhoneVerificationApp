package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.models.entities.SurveyInvitation;
import edu.howard.research.smsbackend.models.entities.SurveyLinkPool;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import edu.howard.research.smsbackend.repositories.SurveyInvitationRepository;
import edu.howard.research.smsbackend.repositories.SurveyLinkPoolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvitationsService {

    private final SurveyInvitationRepository inviteRepo;
    private final SurveyLinkPoolRepository linkRepo;
    private final ParticipantRepository participantRepo;

    /**
     * Idempotent: if an active invitation already exists for the phone, return it (resend same link).
     * Otherwise claim one link from the pool and create a new invitation.
     * Returns Optional.empty() if no links are available.
     * Does NOT assume a link relation or a batchLabel field on SurveyInvitation.
     */
    @Transactional
    public Optional<SurveyInvitation> getOrAssignByPhone(String phone, String batchLabel) {
        // 1) Reuse existing active invite
        Optional<SurveyInvitation> existing = inviteRepo.findActiveByPhone(phone);
        if (existing.isPresent()) {
            return existing;
        }

        // 2) Claim a link from the pool (by batch if provided, else any)
        SurveyLinkPoolRepository.ClaimResult claim = (batchLabel != null && !batchLabel.isBlank())
                ? linkRepo.claimAvailable(batchLabel).orElse(null)
                : linkRepo.claimAny().orElse(null);

        if (claim == null) {
            // No links available - return empty instead of throwing
            return Optional.empty();
        }

        // 3) Load participant (must exist already)
        Participant participant = participantRepo.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("Unknown participant: " + phone));

        // 4) Create invitation (store URL; no assumption about link relation/batchLabel field)
        SurveyInvitation inv = new SurveyInvitation();
        inv.setParticipant(participant);
        
        // Create link reference for the foreign key constraint
        SurveyLinkPool linkRef = new SurveyLinkPool();
        linkRef.setId(claim.getLinkId());
        inv.setLink(linkRef);
        
        inv.setCreatedAt(OffsetDateTime.now());
        inv.setMessageStatus("pending");
        inv.setLinkUrl(claim.getLinkUrl());  // denormalized URL for easy sending
        inv.setShortLinkUrl(claim.getShortLinkUrl());  // denormalized short URL

        inv = inviteRepo.save(inv);

        // 5) Flip the pool row to ASSIGNED (if that matches your state machine)
        linkRepo.markAssigned(claim.getLinkId());

        return Optional.of(inv);
    }

    /**
     * Same as getOrAssignByPhone but resilient to a race where two requests try simultaneously.
     * If the unique index on "active invite" trips, we fetch and return the existing invite.
     */
    @Transactional
    public Optional<SurveyInvitation> getOrAssignByPhoneWithRetry(String phone, String batchLabel) {
        try {
            return getOrAssignByPhone(phone, batchLabel);
        } catch (DataIntegrityViolationException e) {
            return inviteRepo.findActiveByPhone(phone);
        }
    }

    /**
     * Mark an invitation completed. (If you later add a link relation, you can also mark the link EXHAUSTED here.)
     */
    @Transactional
    public SurveyInvitation complete(UUID invitationId) {
        SurveyInvitation inv = inviteRepo.findById(invitationId).orElseThrow();
        inv.setCompletedAt(OffsetDateTime.now());
        inv.setMessageStatus("completed");
        return inviteRepo.save(inv);
    }

    /**
     * Mark an invitation as not completed (undo completion)
     */
    @Transactional
    public SurveyInvitation uncomplete(UUID invitationId) {
        SurveyInvitation inv = inviteRepo.findById(invitationId).orElseThrow();
        inv.setCompletedAt(null);
        inv.setMessageStatus("delivered"); // Reset to previous status
        return inviteRepo.save(inv);
    }

    /**
     * Bulk mark invitations as completed
     */
    @Transactional
    public int bulkComplete(java.util.List<UUID> invitationIds) {
        int completedCount = 0;
        OffsetDateTime now = OffsetDateTime.now();
        
        for (UUID invitationId : invitationIds) {
            try {
                SurveyInvitation inv = inviteRepo.findById(invitationId).orElse(null);
                if (inv != null && inv.getCompletedAt() == null) {
                    inv.setCompletedAt(now);
                    inv.setMessageStatus("completed");
                    inviteRepo.save(inv);
                    completedCount++;
                }
            } catch (Exception e) {
                // Log error but continue with other invitations
                System.err.println("Failed to complete invitation " + invitationId + ": " + e.getMessage());
            }
        }
        
        return completedCount;
    }

    /**
     * Bulk mark invitations as not completed
     */
    @Transactional
    public int bulkUncomplete(java.util.List<UUID> invitationIds) {
        int uncompletedCount = 0;
        
        for (UUID invitationId : invitationIds) {
            try {
                SurveyInvitation inv = inviteRepo.findById(invitationId).orElse(null);
                if (inv != null && inv.getCompletedAt() != null) {
                    inv.setCompletedAt(null);
                    inv.setMessageStatus("delivered"); // Reset to previous status
                    inviteRepo.save(inv);
                    uncompletedCount++;
                }
            } catch (Exception e) {
                // Log error but continue with other invitations
                System.err.println("Failed to uncomplete invitation " + invitationId + ": " + e.getMessage());
            }
        }
        
        return uncompletedCount;
    }

    @Transactional
    public void markQueued(java.util.UUID invitationId, String sid) {
        inviteRepo.setQueued(invitationId, sid, "queued", java.time.OffsetDateTime.now());
    }
}
