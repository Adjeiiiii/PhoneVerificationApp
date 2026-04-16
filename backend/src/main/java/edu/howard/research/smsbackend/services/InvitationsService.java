package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.BulkCompleteByLinksResponse;
import edu.howard.research.smsbackend.models.dto.LinkPreviewDto;
import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.models.entities.SurveyInvitation;
import edu.howard.research.smsbackend.models.entities.SurveyLinkPool;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import edu.howard.research.smsbackend.repositories.SurveyInvitationRepository;
import edu.howard.research.smsbackend.repositories.SurveyLinkPoolRepository;
import edu.howard.research.smsbackend.util.LinkUrlUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
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
        inv.setLinkUrl(LinkUrlUtils.appendParticipantUid(claim.getLinkUrl(), claim.getLinkPublicUid()));
        inv.setShortLinkUrl(claim.getShortLinkUrl());

        inv = inviteRepo.save(inv);

        // 5) Flip the pool row to ASSIGNED (if that matches your state machine)
        linkRepo.markAssigned(claim.getLinkId());

        return Optional.of(inv);
    }

    /** Resolve an exported or callback URL to an invitation (pool URL, long+uid, or long without uid). */
    public Optional<SurveyInvitation> findInvitationForSubmittedLink(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }
        String trimmed = url.trim();
        String base = LinkUrlUtils.withoutUidParameter(trimmed);
        var hits = inviteRepo.findForSurveyCompletion(trimmed, base, PageRequest.of(0, 1));
        return hits.isEmpty() ? Optional.empty() : Optional.of(hits.get(0));
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

    /**
     * Bulk mark invitations as completed by their full link URLs.
     * Returns detailed breakdown: newly completed, already completed, not found, duplicates.
     */
    @Transactional
    public BulkCompleteByLinksResponse bulkCompleteByLinks(List<String> links) {
        if (links == null || links.isEmpty()) {
            return new BulkCompleteByLinksResponse(0, 0, 0, 0, 0, Collections.emptyList(), Collections.emptyList());
        }

        // Normalize URLs (trim whitespace)
        List<String> normalizedLinks = links.stream()
                .map(String::trim)
                .filter(url -> !url.isBlank())
                .collect(Collectors.toList());

        int totalLinksInFile = normalizedLinks.size();

        // Find duplicates in the input file
        Map<String, Long> urlCounts = normalizedLinks.stream()
                .collect(Collectors.groupingBy(url -> url, Collectors.counting()));
        
        List<String> duplicateLinks = urlCounts.entrySet().stream()
                .filter(entry -> entry.getValue() > 1)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        
        int duplicatesInFile = duplicateLinks.size();

        // Get unique URLs (deduplicate for processing)
        Set<String> uniqueUrls = new HashSet<>(normalizedLinks);
        List<String> uniqueUrlList = new ArrayList<>(uniqueUrls);

        Map<String, SurveyInvitation> urlToInvitation = new LinkedHashMap<>();
        for (String u : uniqueUrlList) {
            findInvitationForSubmittedLink(u).ifPresent(inv -> urlToInvitation.put(u, inv));
        }

        // Categorize invitations
        List<String> notFoundLinks = new ArrayList<>();
        List<String> alreadyCompletedLinks = new ArrayList<>();
        List<SurveyInvitation> toComplete = new ArrayList<>();

        for (String url : uniqueUrlList) {
            SurveyInvitation inv = urlToInvitation.get(url);
            if (inv == null) {
                notFoundLinks.add(url);
            } else if (inv.getCompletedAt() != null) {
                alreadyCompletedLinks.add(url);
            } else {
                toComplete.add(inv);
            }
        }
        
        // Verify all unique links are categorized
        int categorizedCount = notFoundLinks.size() + alreadyCompletedLinks.size() + toComplete.size();
        if (categorizedCount != uniqueUrlList.size()) {
            log.warn("Mismatch in categorization: {} unique URLs but {} categorized", uniqueUrlList.size(), categorizedCount);
        }

        // Mark invitations as completed
        OffsetDateTime now = OffsetDateTime.now();
        int newlyCompleted = 0;

        for (SurveyInvitation inv : toComplete) {
            try {
                inviteRepo.markCompletedById(inv.getId(), now);
                newlyCompleted++;

                // Mark associated link as exhausted (same as webhook does)
                if (inv.getLink() != null && inv.getLink().getId() != null) {
                    try {
                        linkRepo.markExhausted(inv.getLink().getId());
                    } catch (Exception ex) {
                        // Log but don't fail the operation
                        System.err.println("Failed to mark link exhausted for invitation " + inv.getId() + ": " + ex.getMessage());
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to complete invitation " + inv.getId() + ": " + e.getMessage());
            }
        }

        return new BulkCompleteByLinksResponse(
                totalLinksInFile,
                newlyCompleted,
                alreadyCompletedLinks.size(),
                notFoundLinks.size(),
                duplicatesInFile,
                notFoundLinks,
                duplicateLinks
        );
    }

    /**
     * Preview links without processing them. Returns detailed information about each link.
     */
    @Transactional(readOnly = true)
    public List<LinkPreviewDto> previewLinks(List<String> links) {
        if (links == null || links.isEmpty()) {
            return Collections.emptyList();
        }

        // Normalize URLs
        List<String> normalizedLinks = links.stream()
                .map(String::trim)
                .filter(url -> !url.isBlank())
                .collect(Collectors.toList());

        // Find duplicates in the input
        Map<String, Long> urlCounts = normalizedLinks.stream()
                .collect(Collectors.groupingBy(url -> url, Collectors.counting()));

        Set<String> uniqueUrls = new HashSet<>(normalizedLinks);
        Map<String, SurveyInvitation> urlToInvitation = new LinkedHashMap<>();
        for (String u : uniqueUrls) {
            findInvitationForSubmittedLink(u).ifPresent(inv -> urlToInvitation.put(u, inv));
        }

        // Build preview for each link
        List<LinkPreviewDto> previews = new ArrayList<>();
        for (int i = 0; i < normalizedLinks.size(); i++) {
            String url = normalizedLinks.get(i);
            LinkPreviewDto preview = new LinkPreviewDto();
            preview.setLink(url);

            // Check if duplicate in file
            if (urlCounts.get(url) > 1) {
                preview.setStatus("duplicate");
                preview.setMessage("This link appears " + urlCounts.get(url) + " times in the file");
            } else {
                SurveyInvitation inv = urlToInvitation.get(url);
                if (inv == null) {
                    preview.setStatus("not_found");
                    preview.setMessage("Link not found in system");
                } else {
                    preview.setStatus("found");
                    if (inv.getCompletedAt() != null) {
                        preview.setStatus("already_completed");
                        preview.setMessage("Already marked as completed");
                        preview.setIsCompleted(true);
                    } else {
                        preview.setMessage("Ready to mark as completed");
                        preview.setIsCompleted(false);
                    }
                    
                    // Get participant info
                    if (inv.getParticipant() != null) {
                        preview.setParticipantPhone(inv.getParticipant().getPhone());
                        preview.setParticipantName(inv.getParticipant().getName());
                        preview.setParticipantEmail(inv.getParticipant().getEmail());
                    }
                }
            }
            previews.add(preview);
        }

        return previews;
    }
}
