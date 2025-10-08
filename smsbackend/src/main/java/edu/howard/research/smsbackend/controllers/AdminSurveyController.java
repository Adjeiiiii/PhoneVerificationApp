package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.LinkUploadRequest;
import edu.howard.research.smsbackend.models.dto.UploadResult;
import edu.howard.research.smsbackend.models.entities.GiftCard;
import edu.howard.research.smsbackend.models.entities.LinkStatus;
import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.models.entities.ParticipantStatus;
import edu.howard.research.smsbackend.models.entities.SurveyInvitation;
import edu.howard.research.smsbackend.models.entities.SurveyLinkPool;
import edu.howard.research.smsbackend.repositories.GiftCardDistributionLogRepository;
import edu.howard.research.smsbackend.repositories.GiftCardRepository;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import edu.howard.research.smsbackend.repositories.SurveyInvitationRepository;
import edu.howard.research.smsbackend.repositories.SurveyLinkPoolRepository;
import edu.howard.research.smsbackend.services.EmailService;
import edu.howard.research.smsbackend.services.GiftCardService;
import edu.howard.research.smsbackend.services.InvitationsService;
import edu.howard.research.smsbackend.services.SmsService;
import edu.howard.research.smsbackend.util.PhoneNumberService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminSurveyController {

    private final SurveyLinkPoolRepository linkRepo;
    private final SurveyInvitationRepository inviteRepo;
    private final ParticipantRepository participantRepo;
    private final GiftCardRepository giftCardRepo;
    private final GiftCardDistributionLogRepository distributionLogRepo;
    private final GiftCardService giftCardService;
    private final InvitationsService invitationsService;
    private final SmsService smsService;
    private final EmailService emailService;
    private final PhoneNumberService phoneNumberService;

    // ---------- Helper method to validate JWT token ----------
    private boolean isValidAdminToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return false;
        }
        // For now, we'll rely on Spring Security's JWT filter
        // In a production app, you might want additional validation here
        return true;
    }

    // ---------- Upload links ----------
    @PostMapping("/links/upload")
    public UploadResult upload(@Valid @RequestBody LinkUploadRequest req) {
        int received = (req.getLinks() == null) ? 0 : req.getLinks().size();
        if (received == 0) return new UploadResult(0, 0, List.of());

        int inserted = 0;
        List<String> duplicates = new ArrayList<>();

        for (String raw : req.getLinks()) {
            if (raw == null) continue;
            String url = raw.trim();
            if (url.isEmpty()) continue;

            SurveyLinkPool row = new SurveyLinkPool();
            row.setLinkUrl(url);
            row.setBatchLabel(req.getBatchLabel());
            row.setNotes(req.getNotes());
            row.setUploadedBy(req.getUploadedBy());
            row.setStatus(LinkStatus.AVAILABLE);

            try {
                linkRepo.save(row);
                inserted++;
            } catch (DataIntegrityViolationException e) {
                duplicates.add(url); // unique(link_url) etc.
            }
        }
        return new UploadResult(received, inserted, duplicates);
    }

    // ---------- Upload links via CSV file ----------
    @PostMapping("/upload-links")
    public ResponseEntity<?> uploadCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "batchLabel", required = false) String batchLabel,
            @RequestParam(value = "uploadedBy", required = false) String uploadedBy,
            @RequestParam(value = "notes", required = false) String notes,
            HttpServletRequest request
    ) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }

        try {
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File is empty"));
            }

            if (!file.getOriginalFilename().toLowerCase().endsWith(".csv")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "File must be a CSV file"));
            }

            // Parse CSV content
            String content = new String(file.getBytes());
            String[] lines = content.split("\\r?\\n");
            
            List<String> links = new ArrayList<>();
            for (String line : lines) {
                String trimmed = line.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("#")) { // Skip empty lines and comments
                    links.add(trimmed);
                }
            }

            if (links.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No valid links found in CSV file"));
            }

            // Create upload request
            LinkUploadRequest uploadRequest = new LinkUploadRequest();
            uploadRequest.setLinks(links);
            uploadRequest.setBatchLabel(batchLabel != null ? batchLabel.trim() : "CSV_Upload_" + System.currentTimeMillis());
            uploadRequest.setUploadedBy(uploadedBy != null ? uploadedBy.trim() : "admin");
            uploadRequest.setNotes(notes != null ? notes.trim() : "Uploaded via CSV");

            // Process the upload using existing logic
            UploadResult result = upload(uploadRequest);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "CSV upload completed",
                "received", result.received(),
                "inserted", result.inserted(),
                "duplicates", result.duplicates().size(),
                "duplicateUrls", result.duplicates()
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Failed to process CSV file: " + e.getMessage()));
        }
    }

    // ---------- Test email endpoint ----------
    @PostMapping("/test-email")
    public ResponseEntity<?> testEmail(
            @RequestParam("toEmail") String toEmail,
            @RequestParam(value = "participantName", required = false) String participantName,
            @RequestParam(value = "surveyLink", required = false) String surveyLink,
            HttpServletRequest request
    ) {
        // No authentication required for test endpoint

        try {
            String testLink = surveyLink != null ? surveyLink : "https://example.com/test-survey";
            String testName = participantName != null ? participantName : "Test Participant";
            
            boolean success = emailService.sendSurveyLink(toEmail, testName, testLink);
            
            if (success) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Test email sent successfully",
                    "toEmail", toEmail,
                    "participantName", testName,
                    "surveyLink", testLink
                ));
            } else {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Failed to send test email"));
            }
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Test email failed: " + e.getMessage()));
        }
    }

    // ---------- List links ----------
    @GetMapping("/links")
    public Page<SurveyLinkPool> listLinks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false, name = "batch") String batchLabel,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 200),
                Sort.by(Sort.Direction.DESC, "uploadedAt"));

        if (status != null && !status.isBlank()) {
            LinkStatus st = LinkStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
            return linkRepo.findByStatus(st, pageable);
        }
        if (batchLabel != null && !batchLabel.isBlank()) {
            return linkRepo.findByBatchLabel(batchLabel.trim(), pageable);
        }
        return linkRepo.findAll(pageable);
    }

    // ---------- Mark invalid / exhausted ----------
    @PatchMapping("/links/{id}/invalid")
    public Map<String, Object> markInvalid(@PathVariable UUID id) {
        int n = linkRepo.markInvalid(id);
        return Map.of("ok", n > 0);
    }

    @PatchMapping("/links/{id}/exhausted")
    public Map<String, Object> markExhausted(@PathVariable UUID id) {
        int n = linkRepo.markExhausted(id);
        return Map.of("ok", n > 0);
    }

    // ---------- Update link ----------
    @PutMapping("/update-link/{id}")
    public ResponseEntity<?> updateLink(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> updates,
            HttpServletRequest request
    ) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }

        try {
            // Find the link by ID
            Optional<SurveyLinkPool> linkOpt = linkRepo.findById(id);
            if (linkOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            SurveyLinkPool link = linkOpt.get();
            boolean updated = false;

            // Update link URL if provided
            if (updates.containsKey("link")) {
                String newLink = (String) updates.get("link");
                if (newLink != null && !newLink.trim().isEmpty()) {
                    link.setLinkUrl(newLink.trim());
                    updated = true;
                }
            }

            if (updated) {
                linkRepo.save(link);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Link updated successfully",
                    "id", link.getId(),
                    "link", link.getLinkUrl()
                ));
            } else {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "No valid fields to update"));
            }

        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Link URL already exists"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Failed to update link: " + e.getMessage()));
        }
    }

    // ---------- List invitations ----------
    @GetMapping("/invitations")
    public ResponseEntity<?> listInvites(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String phone,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) int size,
            HttpServletRequest request
    ) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }
        Pageable pageable = PageRequest.of(page, Math.min(size, 200),
                Sort.by(Sort.Direction.DESC, "id")); // safe fallback

        if (phone != null && !phone.isBlank()) {
            String normalizedPhone = phoneNumberService.normalizeToE164(phone.trim());
            return ResponseEntity.ok(inviteRepo.findByParticipant_Phone(normalizedPhone, pageable));
        }
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(inviteRepo.findByMessageStatus(status.trim().toLowerCase(Locale.ROOT), pageable));
        }
        return ResponseEntity.ok(inviteRepo.findAll(pageable));
    }

    // ---------- General stats ----------
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(HttpServletRequest request) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }
        
        long totalInvitations = inviteRepo.count();
        long totalLinks = linkRepo.count();
        long usedLinks = linkRepo.countByStatus(LinkStatus.CLAIMED);
        long availableLinks = linkRepo.countByStatus(LinkStatus.AVAILABLE);
        
        return ResponseEntity.ok(Map.of(
            "totalVerifications", totalInvitations,
            "totalLinks", totalLinks,
            "usedLinks", usedLinks,
            "availableLinks", availableLinks
        ));
    }

    // ---------- Link-pool stats ----------
    @GetMapping("/stats/link-pool")
    public List<SurveyLinkPoolRepository.LinkPoolStatsRow> stats() {
        return linkRepo.fetchStats();
    }

    // ---------- Send/Resend invitation (requires verified phone) ----------
    @PostMapping("/invitations/send")
    public Map<String, Object> sendOrResend(@RequestBody Map<String, String> body) {
        String rawPhone = Objects.requireNonNull(body.get("phone"), "phone required");
        String phone = phoneNumberService.normalizeToE164(rawPhone);
        String batch = body.getOrDefault("batchLabel", null);

        // 0) Require participant to exist and be OTP-verified
        Participant p = participantRepo.findByPhone(phone)
                .orElseThrow(() -> new IllegalArgumentException("Unknown participant: " + phone));
        if (!p.isPhoneVerified()) {
            return Map.of(
                    "ok", false,
                    "error", "not_verified",
                    "message", "Phone must be verified before sending a survey link."
            );
        }

        // 1) Idempotent allocation
        SurveyInvitation inv = invitationsService.getOrAssignByPhoneWithRetry(phone, batch);

        // 2) Send SMS
        String smsBody = "Here's the Howard University AI for Health survey link: " + inv.getLinkUrl() + ". You can pause and restart at any time. The survey MUST be completed within 10 days. Once done, we'll send your Amazon gift card. For questions, text/email us at (240) 428-8442.";
        Map<String, Object> send = smsService.send(phone, smsBody);

        // 3) Persist queued state if accepted by Twilio
        if (Boolean.TRUE.equals(send.get("ok"))) {
            String sid = (String) send.get("sid");
            invitationsService.markQueued(inv.getId(), sid);

            return Map.of(
                    "ok", true,
                    "invitationId", inv.getId(),
                    "participantId", inv.getParticipant().getId(),
                    "status", "queued",
                    "messageSid", sid,
                    "linkUrl", inv.getLinkUrl()
            );
        } else {
            // Keep the invitation; report send failure
            return Map.of(
                    "ok", false,
                    "invitationId", inv.getId(),
                    "participantId", inv.getParticipant().getId(),
                    "status", inv.getMessageStatus(),
                    "error", String.valueOf(send.get("error")),
                    "linkUrl", inv.getLinkUrl()
            );
        }
    }

    // ---------- Mark invitation completed ----------
    @PostMapping("/invitations/{id}/complete")
    public Map<String, Object> complete(@PathVariable UUID id) {
        SurveyInvitation inv = invitationsService.complete(id);
        return Map.of(
                "ok", true,
                "invitationId", inv.getId(),
                "status", inv.getMessageStatus()
        );
    }

    // ---------- Mark invitation as not completed (undo completion) ----------
    @PostMapping("/invitations/{id}/uncomplete")
    public Map<String, Object> uncomplete(@PathVariable UUID id) {
        SurveyInvitation inv = invitationsService.uncomplete(id);
        return Map.of(
                "ok", true,
                "invitationId", inv.getId(),
                "status", inv.getMessageStatus()
        );
    }

    // ---------- Bulk mark invitations as completed ----------
    @PostMapping("/invitations/bulk-complete")
    public ResponseEntity<Map<String, Object>> bulkComplete(@RequestBody List<UUID> invitationIds) {
        try {
            int completedCount = invitationsService.bulkComplete(invitationIds);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Successfully marked " + completedCount + " surveys as completed",
                    "completedCount", completedCount,
                    "totalRequested", invitationIds.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Failed to mark surveys as completed: " + e.getMessage()
            ));
        }
    }

    // ---------- Bulk mark invitations as not completed ----------
    @PostMapping("/invitations/bulk-uncomplete")
    public ResponseEntity<Map<String, Object>> bulkUncomplete(@RequestBody List<UUID> invitationIds) {
        try {
            int uncompletedCount = invitationsService.bulkUncomplete(invitationIds);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Successfully marked " + uncompletedCount + " surveys as not completed",
                    "uncompletedCount", uncompletedCount,
                    "totalRequested", invitationIds.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Failed to mark surveys as not completed: " + e.getMessage()
            ));
        }
    }

    // ---------- Clean up orphaned links ----------
    @PostMapping("/links/cleanup-orphaned")
    public ResponseEntity<?> cleanupOrphanedLinks() {
        try {
            // Find all CLAIMED links
            List<SurveyLinkPool> claimedLinks = linkRepo.findAll().stream()
                    .filter(link -> link.getStatus() == LinkStatus.CLAIMED)
                    .collect(Collectors.toList());
            
            // Find all link IDs that are actually used in invitations
            Set<UUID> usedLinkIds = inviteRepo.findAll().stream()
                    .map(inv -> inv.getLink().getId())
                    .collect(Collectors.toSet());
            
            // Find orphaned links (CLAIMED but not used)
            List<SurveyLinkPool> orphanedLinks = claimedLinks.stream()
                    .filter(link -> !usedLinkIds.contains(link.getId()))
                    .collect(Collectors.toList());
            
            // Reset orphaned links to AVAILABLE
            int cleanedCount = 0;
            for (SurveyLinkPool link : orphanedLinks) {
                link.setStatus(LinkStatus.AVAILABLE);
                linkRepo.save(link);
                cleanedCount++;
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Cleanup completed",
                "orphanedLinksFound", orphanedLinks.size(),
                "linksReset", cleanedCount
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Cleanup failed: " + e.getMessage()));
        }
    }

    // ---------- Update user/participant ----------
    @PutMapping("/update-user/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> updates,
            HttpServletRequest request
    ) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }

        try {
            // Find the invitation by ID
            Optional<SurveyInvitation> invitationOpt = inviteRepo.findById(id);
            if (invitationOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            SurveyInvitation invitation = invitationOpt.get();
            Participant participant = invitation.getParticipant();
            boolean updated = false;

            // Update phone number if provided
            if (updates.containsKey("phone_number")) {
                String newPhone = (String) updates.get("phone_number");
                if (newPhone != null && !newPhone.trim().isEmpty()) {
                    String normalizedPhone = phoneNumberService.normalizeToE164(newPhone.trim());
                    participant.setPhone(normalizedPhone);
                    updated = true;
                }
            }

            // Update email if provided
            if (updates.containsKey("email")) {
                String newEmail = (String) updates.get("email");
                if (newEmail != null && !newEmail.trim().isEmpty()) {
                    participant.setEmail(newEmail.trim());
                    updated = true;
                }
            }

            // Update participant status if provided
            if (updates.containsKey("status")) {
                String newStatus = (String) updates.get("status");
                if (newStatus != null && !newStatus.trim().isEmpty()) {
                    // Map frontend status to participant status
                    switch (newStatus.toLowerCase()) {
                        case "subscribed":
                            participant.setStatus(ParticipantStatus.SUBSCRIBED);
                            break;
                        case "unsubscribed":
                            participant.setStatus(ParticipantStatus.OPTED_OUT);
                            break;
                        case "blocked":
                            participant.setStatus(ParticipantStatus.OPTED_OUT);
                            break;
                    }
                    updated = true;
                }
            }

            // Update message status if provided
            if (updates.containsKey("message_status")) {
                String newMessageStatus = (String) updates.get("message_status");
                if (newMessageStatus != null && !newMessageStatus.trim().isEmpty()) {
                    invitation.setMessageStatus(newMessageStatus.trim().toLowerCase());
                    updated = true;
                }
            }

            if (updated) {
                participantRepo.save(participant);
                inviteRepo.save(invitation);
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "User updated successfully",
                    "id", invitation.getId(),
                    "phone", participant.getPhone(),
                    "email", participant.getEmail() != null ? participant.getEmail() : "",
                    "status", participant.getStatus().toString(),
                    "messageStatus", invitation.getMessageStatus()
                ));
            } else {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "No valid fields to update"));
            }

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Failed to update user: " + e.getMessage()));
        }
    }

    // ---------- Get user deletion info (check for gift cards) ----------
    @GetMapping("/delete-user-info/{id}")
    public ResponseEntity<?> getUserDeletionInfo(
            @PathVariable UUID id,
            HttpServletRequest request
    ) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }

        try {
            // Find the invitation by ID
            Optional<SurveyInvitation> invitationOpt = inviteRepo.findById(id);
            if (invitationOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            SurveyInvitation invitation = invitationOpt.get();
            Participant participant = invitation.getParticipant();

            // Check for associated gift cards
            List<GiftCard> giftCards = giftCardRepo.findByInvitationId(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("hasGiftCards", !giftCards.isEmpty());
            response.put("giftCardCount", giftCards.size());
            
            if (!giftCards.isEmpty()) {
                List<Map<String, Object>> giftCardInfo = giftCards.stream()
                    .map(gc -> {
                        Map<String, Object> info = new HashMap<>();
                        info.put("cardCode", gc.getCardCode());
                        info.put("cardType", gc.getCardType().toString());
                        info.put("cardValue", gc.getCardValue());
                        info.put("status", gc.getStatus().toString());
                        info.put("sentAt", gc.getSentAt());
                        info.put("sentBy", gc.getSentBy());
                        return info;
                    })
                    .collect(Collectors.toList());
                response.put("giftCards", giftCardInfo);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Failed to get user deletion info: " + e.getMessage()));
        }
    }

    // ---------- Delete user/participant ----------
    @DeleteMapping("/delete-user/{id}")
    @Transactional
    public ResponseEntity<?> deleteUser(
            @PathVariable UUID id,
            HttpServletRequest request
    ) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }

        try {
            // Find the invitation by ID
            Optional<SurveyInvitation> invitationOpt = inviteRepo.findById(id);
            if (invitationOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            SurveyInvitation invitation = invitationOpt.get();
            Participant participant = invitation.getParticipant();
            SurveyLinkPool link = invitation.getLink();

            // Get gift cards info before deletion for response
            List<GiftCard> giftCards = giftCardRepo.findByInvitationId(id);
            int giftCardCount = giftCards.size();

            // First, unsend all gift cards associated with this invitation
            for (GiftCard giftCard : giftCards) {
                // Unsend the gift card (mark as UNSENT and make available in pool)
                giftCardService.unsendGiftCard(giftCard.getId(), "SYSTEM_DELETE");
            }

            // Reset the link status to AVAILABLE before deleting
            if (link != null) {
                link.setStatus(LinkStatus.AVAILABLE);
                linkRepo.save(link);
            }

            // Delete the invitation (now safe since gift cards are deleted)
            inviteRepo.delete(invitation);
            
            // Then delete the participant
            participantRepo.delete(participant);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "User deleted successfully");
            response.put("deletedId", id);
            
            if (giftCardCount > 0) {
                response.put("giftCardsDeleted", giftCardCount);
                response.put("giftCardsAvailable", "The gift cards have been made available again and will appear in the unsent history.");
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Failed to delete user: " + e.getMessage()));
        }
    }

    // ---------- Delete link ----------
    @DeleteMapping("/delete-link/{id}")
    public ResponseEntity<?> deleteLink(
            @PathVariable UUID id,
            HttpServletRequest request
    ) {
        // Check authentication
        if (!isValidAdminToken(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized access"));
        }

        try {
            // Find the link by ID
            Optional<SurveyLinkPool> linkOpt = linkRepo.findById(id);
            if (linkOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            SurveyLinkPool link = linkOpt.get();
            
            // Check if link is currently assigned to an invitation
            Optional<SurveyInvitation> invitationOpt = inviteRepo.findByLinkId(id);
            if (invitationOpt.isPresent()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Cannot delete link that is currently assigned to a participant"));
            }

            // Delete the link
            linkRepo.delete(link);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Link deleted successfully",
                "deletedId", id
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Failed to delete link: " + e.getMessage()));
        }
    }
}
