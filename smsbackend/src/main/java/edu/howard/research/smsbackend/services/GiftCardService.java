package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.*;
import edu.howard.research.smsbackend.models.entities.GiftCardStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface GiftCardService {

    /**
     * Create a pending gift card when survey is completed
     */
    void createPendingGiftCard(UUID participantId, UUID invitationId);

    /**
     * Get participants eligible for gift cards (completed surveys, no gift card yet)
     */
    List<EligibleParticipantDto> getEligibleParticipants();

    /**
     * Send gift card to participant (admin action)
     */
    GiftCardDto sendGiftCard(UUID participantId, SendGiftCardRequest request, String adminUsername);

    /**
     * Get all gift cards
     */
    Page<GiftCardDto> getAllGiftCards(Pageable pageable);

    /**
     * Get gift cards with filters
     */
    Page<GiftCardDto> getGiftCards(GiftCardStatus status, String participantName, String participantPhone,
                                  String sentBy, java.time.OffsetDateTime fromDate, java.time.OffsetDateTime toDate,
                                  Pageable pageable);

    /**
     * Get gift card by ID
     */
    GiftCardDto getGiftCardById(UUID giftCardId);

    /**
     * Resend gift card
     */
    GiftCardDto resendGiftCard(UUID giftCardId, String adminUsername);

    /**
     * Add notes to gift card
     */
    void addNotes(UUID giftCardId, String notes, String adminUsername);

    /**
     * Update delivery status (from webhooks)
     */
    void updateDeliveryStatus(UUID giftCardId, String method, String status);

    /**
     * Get distribution logs for a gift card
     */
    List<DistributionLogDto> getDistributionLogs(UUID giftCardId);

    /**
     * Upload gift cards from CSV
     */
    UploadResultDto uploadGiftCards(MultipartFile file, String batchLabel, String adminUsername);

    /**
     * Add single gift card to pool
     */
    GiftCardPoolDto addGiftCardToPool(AddGiftCardRequest request, String adminUsername);

    /**
     * Get pool status
     */
    PoolStatusDto getPoolStatus();

    /**
     * Get available gift cards from pool
     */
    Page<GiftCardPoolDto> getAvailableGiftCards(Pageable pageable);

    /**
     * Get gift cards by batch
     */
    Page<GiftCardPoolDto> getGiftCardsByBatch(String batchLabel, Pageable pageable);

    /**
     * Export used gift cards
     */
    byte[] exportUsedGiftCards();

    /**
     * Delete gift card from pool
     */
    void deleteGiftCardFromPool(UUID poolId, String adminUsername);

    /**
     * Delete sent gift card (mark as cancelled)
     */
    void deleteGiftCard(UUID giftCardId, String adminUsername);
}
