package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.*;
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
        log.info("Get gift cards request - page: {}, size: {}", page, size);
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        log.info("Admin username: {}", adminUsername);

        Pageable pageable = PageRequest.of(page, size);
        Page<GiftCardDto> giftCards = giftCardService.getAllGiftCards(pageable);
        log.info("Returning {} gift cards", giftCards.getTotalElements());
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
        // Get admin username from JWT token
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        // Debug logging
        log.info("Send gift card request for participant: {}, admin username: {}", participantId, adminUsername);
        
        // Check if authentication is valid
        if ("SYSTEM".equals(adminUsername)) {
            log.warn("Access denied: No valid authentication found for send gift card request");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
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
     * Upload gift cards from CSV
     */
    @PostMapping("/pool/upload")
    public ResponseEntity<UploadResultDto> uploadGiftCards(
            @RequestParam("file") MultipartFile file,
            @RequestParam("batchLabel") String batchLabel
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
     * Delete gift card from pool
     */
    @DeleteMapping("/pool/{poolId}")
    public ResponseEntity<Void> deleteGiftCardFromPool(@PathVariable UUID poolId) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        giftCardService.deleteGiftCardFromPool(poolId, adminUsername);
        return ResponseEntity.ok().build();
    }

    /**
     * Delete sent gift card
     */
    @DeleteMapping("/{giftCardId}")
    public ResponseEntity<Void> deleteGiftCard(@PathVariable UUID giftCardId) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        
        giftCardService.deleteGiftCard(giftCardId, adminUsername);
        return ResponseEntity.ok().build();
    }
}
