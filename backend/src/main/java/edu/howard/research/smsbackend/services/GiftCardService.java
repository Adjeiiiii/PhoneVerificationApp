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
     * Batch send gift cards to multiple participants
     */
    BatchSendGiftCardResult batchSendGiftCards(BatchSendGiftCardRequest request, String adminUsername);

    /**
     * Get all gift cards
     */
    Page<GiftCardDto> getAllGiftCards(Pageable pageable);

    /**
     * Get gift cards by status
     */
    Page<GiftCardDto> getGiftCardsByStatus(GiftCardStatus status, Pageable pageable);

    /**
     * Get gift cards with filters
     */
    Page<GiftCardDto> getGiftCards(GiftCardStatus status, String participantPhone,
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
     * Get gift cards from pool by status and optional code search (null = no filter)
     */
    Page<GiftCardPoolDto> getGiftCardsFromPool(edu.howard.research.smsbackend.models.entities.PoolStatus status, String code, Pageable pageable);

    /**
     * Get gift cards by batch
     */
    Page<GiftCardPoolDto> getGiftCardsByBatch(String batchLabel, Pageable pageable);

    /**
     * Export used gift cards
     */
    byte[] exportUsedGiftCards();

    /**
     * Update gift card in pool
     */
    GiftCardPoolDto updateGiftCardInPool(UUID poolId, UpdateGiftCardRequest request, String adminUsername);

    /**
     * Delete gift card from pool (for cards never sent to users)
     */
    void deleteGiftCardFromPool(UUID poolId, String adminUsername);

    /**
     * Unsend gift card (mark as unsent and make available again)
     */
    void unsendGiftCard(UUID giftCardId, String adminUsername);

    /**
     * Get unsent gift cards history
     */
    Page<UnsentGiftCardDto> getUnsentGiftCards(Pageable pageable);

    /**
     * Check if an invitation has a gift card
     */
    boolean hasGiftCardForInvitation(UUID invitationId);

    /**
     * Cleanup orphaned ASSIGNED pool cards (cards marked as ASSIGNED but not linked to any gift card)
     */
    int cleanupOrphanedAssignedPoolCards();
}
