package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.*;
import edu.howard.research.smsbackend.models.entities.PoolStatus;
import edu.howard.research.smsbackend.models.entities.GiftCardStatus;
import edu.howard.research.smsbackend.security.JwtAuthenticationFilter;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/gift-cards")
@RequiredArgsConstructor
@Slf4j
public class AdminGiftCardController {

    private final GiftCardService giftCardService;

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
    public ResponseEntity<Page<GiftCardPoolDto>> getGiftCardsFromPool(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        PoolStatus poolStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                poolStatus = PoolStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().build();
            }
        }
        Page<GiftCardPoolDto> giftCards = giftCardService.getGiftCardsFromPool(poolStatus, pageable);
        return ResponseEntity.ok(giftCards);
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
}
