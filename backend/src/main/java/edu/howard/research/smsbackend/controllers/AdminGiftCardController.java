package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.*;
import edu.howard.research.smsbackend.models.entities.PoolStatus;
import edu.howard.research.smsbackend.models.entities.GiftCardStatus;
import edu.howard.research.smsbackend.security.JwtAuthenticationFilter;
import edu.howard.research.smsbackend.services.EmailService;
import edu.howard.research.smsbackend.services.GiftCardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/gift-cards")
@RequiredArgsConstructor
@Slf4j
public class AdminGiftCardController {

    private final GiftCardService giftCardService;
    private final EmailService emailService;

    /**
     * Get participants eligible for gift cards (completed surveys, no gift card yet)
     */
    @GetMapping("/eligible")
    public ResponseEntity<List<EligibleParticipantDto>> getEligibleParticipants() {
        List<EligibleParticipantDto> eligibleParticipants = giftCardService.getEligibleParticipants();
        return ResponseEntity.ok(eligibleParticipants);
    }

    /**
     * Get all gift cards
     */
    @GetMapping
    public ResponseEntity<Page<GiftCardDto>> getGiftCards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        log.debug("Get gift cards request - page: {}, size: {}", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<GiftCardDto> giftCards = giftCardService.getAllGiftCards(pageable);
        return ResponseEntity.ok(giftCards);
    }

    /**
     * Get sent gift cards only
     */
    @GetMapping("/sent")
    public ResponseEntity<Page<GiftCardDto>> getSentGiftCards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        log.debug("Get sent gift cards request - page: {}, size: {}", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<GiftCardDto> giftCards = giftCardService.getGiftCardsByStatus(GiftCardStatus.SENT, pageable);
        return ResponseEntity.ok(giftCards);
    }

    /**
     * Get gift card by ID
     */
    @GetMapping("/{giftCardId}")
    public ResponseEntity<GiftCardDto> getGiftCard(@PathVariable UUID giftCardId) {
        GiftCardDto giftCard = giftCardService.getGiftCardById(giftCardId);
        return ResponseEntity.ok(giftCard);
    }

    /**
     * Send gift card to participant
     */
    @PostMapping("/send/{participantId}")
    public ResponseEntity<GiftCardDto> sendGiftCard(
            @PathVariable UUID participantId,
            @Valid @RequestBody SendGiftCardRequest request
    ) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        log.info("Send gift card request for participant: {}, admin: {}", participantId, adminUsername);

        GiftCardDto giftCard = giftCardService.sendGiftCard(participantId, request, adminUsername);
        return ResponseEntity.status(HttpStatus.CREATED).body(giftCard);
    }

    /**
     * Batch send gift cards to multiple participants
     */
    @PostMapping("/batch-send")
    public ResponseEntity<BatchSendGiftCardResult> batchSendGiftCards(
            @Valid @RequestBody BatchSendGiftCardRequest request
    ) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        log.info("Batch send gift cards request for {} participants, admin: {}", 
                request.getParticipants().size(), adminUsername);

        BatchSendGiftCardResult result = giftCardService.batchSendGiftCards(request, adminUsername);
        return ResponseEntity.ok(result);
    }

    /**
     * Resend gift card
     */
    @PostMapping("/{giftCardId}/resend")
    public ResponseEntity<GiftCardDto> resendGiftCard(@PathVariable UUID giftCardId) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        GiftCardDto giftCard = giftCardService.resendGiftCard(giftCardId, adminUsername);
        return ResponseEntity.ok(giftCard);
    }

    /**
     * Add notes to gift card
     */
    @PostMapping("/{giftCardId}/notes")
    public ResponseEntity<Void> addNotes(
            @PathVariable UUID giftCardId,
            @Valid @RequestBody AddNotesRequest request
    ) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        giftCardService.addNotes(giftCardId, request.getNotes(), adminUsername);
        return ResponseEntity.ok().build();
    }

    /**
     * Get distribution logs for a gift card
     */
    @GetMapping("/{giftCardId}/logs")
    public ResponseEntity<List<DistributionLogDto>> getDistributionLogs(@PathVariable UUID giftCardId) {
        List<DistributionLogDto> logs = giftCardService.getDistributionLogs(giftCardId);
        return ResponseEntity.ok(logs);
    }

    /**
     * Upload gift card codes from file (one code per line)
     * Simplified format: just codes, no additional fields required
     */
    @PostMapping("/pool/upload")
    public ResponseEntity<UploadResultDto> uploadGiftCards(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "batchLabel", required = false) String batchLabel
    ) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        UploadResultDto result = giftCardService.uploadGiftCards(file, batchLabel, adminUsername);
        return ResponseEntity.ok(result);
    }

    /**
     * Add single gift card to pool
     */
    @PostMapping("/pool/add")
    public ResponseEntity<GiftCardPoolDto> addGiftCardToPool(
            @Valid @RequestBody AddGiftCardRequest request
    ) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        GiftCardPoolDto giftCard = giftCardService.addGiftCardToPool(request, adminUsername);
        return ResponseEntity.status(HttpStatus.CREATED).body(giftCard);
    }

    /**
     * Get pool status
     */
    @GetMapping("/pool/status")
    public ResponseEntity<PoolStatusDto> getPoolStatus() {
        PoolStatusDto status = giftCardService.getPoolStatus();
        return ResponseEntity.ok(status);
    }

    /**
     * Get available gift cards from pool
     */
    @GetMapping("/pool/available")
    public ResponseEntity<Page<GiftCardPoolDto>> getAvailableGiftCards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<GiftCardPoolDto> giftCards = giftCardService.getAvailableGiftCards(pageable);
        return ResponseEntity.ok(giftCards);
    }

    /**
     * Get gift cards from pool with optional status filter
     */
    @GetMapping("/pool")
    public ResponseEntity<?> getGiftCardsFromPool(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String code,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        log.info("GET /pool - status={}, code={}, page={}, size={}", status, code, page, size);
        Pageable pageable = PageRequest.of(page, size);
        PoolStatus poolStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                poolStatus = PoolStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status parameter: {}", status, e);
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("ok", false);
                errorResponse.put("error", "Invalid status parameter: " + status + ". Valid values are: AVAILABLE, ASSIGNED, EXPIRED, INVALID");
                errorResponse.put("status", HttpStatus.BAD_REQUEST.value());
                return ResponseEntity.badRequest().body(errorResponse);
            }
        }
        // Normalize code - convert empty string to null
        String normalizedCode = (code == null || code.trim().isEmpty()) ? null : code.trim();
        try {
            Page<GiftCardPoolDto> giftCards = giftCardService.getGiftCardsFromPool(poolStatus, normalizedCode, pageable);
            log.info("GET /pool - returning {} cards (total: {})", giftCards.getNumberOfElements(), giftCards.getTotalElements());
            return ResponseEntity.ok(giftCards);
        } catch (Exception e) {
            log.error("Error fetching gift cards from pool", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("ok", false);
            errorResponse.put("error", "Failed to fetch gift cards: " + e.getMessage());
            errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Get gift cards by batch
     */
    @GetMapping("/pool/batch/{batchLabel}")
    public ResponseEntity<Page<GiftCardPoolDto>> getGiftCardsByBatch(
            @PathVariable String batchLabel,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<GiftCardPoolDto> giftCards = giftCardService.getGiftCardsByBatch(batchLabel, pageable);
        return ResponseEntity.ok(giftCards);
    }

    /**
     * Export used gift cards
     */
    @GetMapping("/pool/export/used")
    public ResponseEntity<byte[]> exportUsedGiftCards() {
        byte[] csvData = giftCardService.exportUsedGiftCards();
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=used_gift_cards.csv")
                .body(csvData);
    }

    /**
     * Get unsent gift cards history
     */
    @GetMapping("/unsent")
    public ResponseEntity<Page<UnsentGiftCardDto>> getUnsentGiftCards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        Page<UnsentGiftCardDto> unsentGiftCards = giftCardService.getUnsentGiftCards(pageable);
        return ResponseEntity.ok(unsentGiftCards);
    }

    /**
     * Check if an invitation has a gift card
     */
    @GetMapping("/check-invitation/{invitationId}")
    public ResponseEntity<Map<String, Object>> checkGiftCardForInvitation(@PathVariable UUID invitationId) {
        boolean hasGiftCard = giftCardService.hasGiftCardForInvitation(invitationId);
        return ResponseEntity.ok(Map.of("hasGiftCard", hasGiftCard));
    }

    /**
     * Update gift card in pool
     */
    @PutMapping("/pool/{poolId}")
    public ResponseEntity<GiftCardPoolDto> updateGiftCardInPool(
            @PathVariable UUID poolId,
            @Valid @RequestBody UpdateGiftCardRequest request
    ) {
        try {
            String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
            
            GiftCardPoolDto updatedCard = giftCardService.updateGiftCardInPool(poolId, request, adminUsername);
            return ResponseEntity.ok(updatedCard);
        } catch (Exception e) {
            log.error("Error updating gift card in pool: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Delete gift card from pool
     */
    @DeleteMapping("/pool/{poolId}")
    public ResponseEntity<Void> deleteGiftCardFromPool(@PathVariable UUID poolId) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        giftCardService.deleteGiftCardFromPool(poolId, adminUsername);
        return ResponseEntity.ok().build();
    }

    /**
     * Unsend gift card (mark as unsent and make available again)
     */
    @PostMapping("/{giftCardId}/unsend")
    public ResponseEntity<Void> unsendGiftCard(@PathVariable UUID giftCardId) {
        log.info("Unsend gift card request for ID: {}", giftCardId);
        
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        log.info("Admin username from JWT: {}", adminUsername);
        
        giftCardService.unsendGiftCard(giftCardId, adminUsername);
        log.info("Gift card unsent successfully");
        
        return ResponseEntity.ok().build();
    }

    /**
     * Cleanup orphaned ASSIGNED pool cards (manual trigger)
     */
    @PostMapping("/pool/cleanup-orphaned")
    public ResponseEntity<Map<String, Object>> cleanupOrphanedPoolCards() {
        log.info("Manual cleanup of orphaned pool cards requested");
        
        int cleanedCount = giftCardService.cleanupOrphanedAssignedPoolCards();
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Cleanup completed",
            "orphanedCardsFound", cleanedCount,
            "cardsReset", cleanedCount
        ));
    }

    /**
     * Test sending a gift card email to a participant
     */
    @PostMapping("/test-email")
    public ResponseEntity<Map<String, Object>> testGiftCardEmail(
            @RequestParam("toEmail") String toEmail,
            @RequestParam(value = "participantName", required = false) String participantName,
            @RequestParam(value = "cardCode", required = false) String cardCode
    ) {
        log.info("Test gift card email requested to: {}", toEmail);
        
        try {
            String testName = participantName != null && !participantName.trim().isEmpty() 
                    ? participantName 
                    : "Test Participant";
            String testCode = cardCode != null && !cardCode.trim().isEmpty() 
                    ? cardCode 
                    : "TEST-123456-CODE";
            
            // Build a test gift card email HTML
            String htmlContent = String.format("""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Your Gift Card - Howard Research Study</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h1 style="color: #2c3e50; margin: 0;">Your Gift Card</h1>
                    </div>
                    
                    <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
                        <h2 style="color: #2c3e50;">Hello %s!</h2>
                        
                        <p>Thank you for completing the survey! Here's your Amazon gift card:</p>
                        
                        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; border: 2px solid #ffc107;">
                            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #856404;">
                                Gift Card Code: <span style="font-family: monospace; font-size: 20px;">%s</span>
                            </p>
                        </div>
                        
                        <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                            <a href="%s" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                Redeem Your Gift Card
                            </a>
                        </div>
                        
                        <p><strong>How to redeem:</strong></p>
                        <ol>
                            <li>Click the "Redeem Your Gift Card" button above or visit <a href="%s">%s</a></li>
                            <li>Enter your gift card code: <strong>%s</strong></li>
                            <li>Follow the instructions to add it to your Amazon account</li>
                        </ol>
                        
                        <p>If you have any questions, please contact us at <a href="tel:2404288442">(240) 428-8442</a> or reply to this email.</p>
                        
                        <p>Thank you for your participation!</p>
                        
                        <p style="margin-top: 30px;">
                            <strong>The HCAI Research Team</strong><br>
                            Howard University<br>
                            HCAI (Howard University Research)
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
                        <p>This is a test email. Gift card code shown is for testing purposes only.</p>
                    </div>
                </body>
                </html>
                """, testName, testCode, "https://www.amazon.com/gc/redeem", "https://www.amazon.com/gc/redeem", "https://www.amazon.com/gc/redeem", testCode);
            
            String subject = "Your Gift Card - Howard Research Study (TEST)";
            edu.howard.research.smsbackend.models.dto.EmailSendResult result = 
                    emailService.sendGiftCardWithDetails(toEmail, testName, subject, htmlContent);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", result.isSuccess());
            response.put("toEmail", toEmail);
            response.put("participantName", testName);
            response.put("cardCode", testCode);
            
            if (result.isSuccess()) {
                response.put("message", "Test gift card email sent successfully");
                return ResponseEntity.ok(response);
            } else {
                response.put("error", result.getErrorMessage());
                if (result.getStatusCode() != null) {
                    response.put("statusCode", result.getStatusCode());
                }
                if (result.getResponseBody() != null) {
                    response.put("responseBody", result.getResponseBody());
                }
                return ResponseEntity.badRequest().body(response);
            }
            
        } catch (Exception e) {
            log.error("Test gift card email failed: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Test email failed: " + e.getMessage()));
        }
    }
}
