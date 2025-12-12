package edu.howard.research.smsbackend.services;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;
import edu.howard.research.smsbackend.exceptions.NotFoundException;
import edu.howard.research.smsbackend.models.dto.*;
import edu.howard.research.smsbackend.models.entities.*;
import edu.howard.research.smsbackend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GiftCardServiceImpl implements GiftCardService {

    private final GiftCardRepository giftCardRepository;
    private final GiftCardPoolRepository giftCardPoolRepository;
    private final GiftCardDistributionLogRepository distributionLogRepository;
    private final ParticipantRepository participantRepository;
    private final SurveyInvitationRepository invitationRepository;
    private final EmailService emailService;
    private final SmsService smsService;

    @Override
    @Transactional
    public void createPendingGiftCard(UUID participantId, UUID invitationId) {
        // Check if gift card already exists
        if (giftCardRepository.existsByParticipantIdAndInvitationId(participantId, invitationId)) {
            log.info("Gift card already exists for participant {} and invitation {}", participantId, invitationId);
            return;
        }

        // Create pending gift card record
        GiftCard giftCard = new GiftCard();
        
        Participant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new NotFoundException("Participant not found: " + participantId));
        giftCard.setParticipant(participant);
        
        SurveyInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new NotFoundException("Invitation not found: " + invitationId));
        giftCard.setInvitation(invitation);
        
        giftCard.setStatus(GiftCardStatus.PENDING);
        giftCard.setSource("MANUAL");
        
        giftCard = giftCardRepository.save(giftCard);
        
        // Log the creation
        logDistributionAction(giftCard.getId(), DistributionAction.CREATED, "SYSTEM", 
                Map.of("reason", "survey_completed", "participant_id", participantId, "invitation_id", invitationId));
        
        log.info("Created pending gift card {} for participant {} and invitation {}", 
                giftCard.getId(), participantId, invitationId);
    }

    @Override
    public List<EligibleParticipantDto> getEligibleParticipants() {
        List<Object[]> results = giftCardRepository.findEligibleParticipants();
        
        return results.stream().map(row -> {
            Participant participant = (Participant) row[0];
            SurveyInvitation invitation = (SurveyInvitation) row[1];
            
            return new EligibleParticipantDto(
                    participant.getId(),
                    participant.getName(),
                    participant.getPhone(),
                    participant.getEmail(),
                    invitation.getId(),
                    invitation.getLinkUrl(),
                    invitation.getCompletedAt(),
                    participant.getVerifiedAt()
            );
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GiftCardDto sendGiftCard(UUID participantId, SendGiftCardRequest request, String adminUsername) {
        // Get participant
        Participant participant = participantRepository.findById(participantId)
                .orElseThrow(() -> new NotFoundException("Participant not found: " + participantId));
        
        // Get the invitation by ID from the request
        SurveyInvitation invitation = invitationRepository.findById(request.getInvitationId())
                .orElseThrow(() -> new NotFoundException("Invitation not found: " + request.getInvitationId()));
        
        // Verify the invitation belongs to this participant
        if (!invitation.getParticipant().getId().equals(participantId)) {
            throw new IllegalArgumentException("Invitation does not belong to this participant");
        }
        
        // Automatically pick an available card from the pool
        GiftCardPool poolCard = giftCardPoolRepository.findAvailable(
                PageRequest.of(0, 1)
        ).getContent().stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No available gift cards in the pool. Please add gift cards to the pool first."));
        
        // Find or create gift card
        GiftCard giftCard = giftCardRepository.findByParticipantIdAndInvitationId(participantId, invitation.getId())
                .orElseGet(() -> {
                    GiftCard newGiftCard = new GiftCard();
                    newGiftCard.setParticipant(participant);
                    newGiftCard.setInvitation(invitation);
                    newGiftCard.setStatus(GiftCardStatus.PENDING);
                    // Don't save yet - will be saved after setting all required fields
                    return newGiftCard;
                });

        // Validate pool card has required fields
        if (poolCard.getCardCode() == null || poolCard.getCardCode().trim().isEmpty()) {
            throw new IllegalStateException("Pool card has no code - cannot send gift card");
        }

        // Update gift card details from pool card
        giftCard.setCardCode(poolCard.getCardCode().trim());
        giftCard.setCardType(poolCard.getCardType() != null ? poolCard.getCardType() : GiftCardType.AMAZON);
        giftCard.setCardValue(poolCard.getCardValue() != null ? poolCard.getCardValue() : BigDecimal.ZERO);
        giftCard.setRedemptionUrl(poolCard.getRedemptionUrl() != null && !poolCard.getRedemptionUrl().trim().isEmpty() 
                ? poolCard.getRedemptionUrl().trim() 
                : DEFAULT_REDEMPTION_URL);
        giftCard.setRedemptionInstructions(poolCard.getRedemptionInstructions());
        giftCard.setExpiresAt(poolCard.getExpiresAt() != null ? poolCard.getExpiresAt() : request.getExpiresAt());
        giftCard.setNotes(request.getNotes() != null ? request.getNotes().trim() : null);
        giftCard.setSource("POOL");
        giftCard.setPoolId(poolCard.getId());
        giftCard.setSentBy(adminUsername);
        giftCard.setSentAt(OffsetDateTime.now());
        giftCard.setStatus(GiftCardStatus.SENT);

        // Validate all required fields are set before saving
        if (giftCard.getCardCode() == null || giftCard.getCardCode().trim().isEmpty()) {
            throw new IllegalStateException("Card code is required");
        }
        if (giftCard.getCardType() == null) {
            throw new IllegalStateException("Card type is required");
        }
        if (giftCard.getCardValue() == null) {
            throw new IllegalStateException("Card value is required");
        }
        if (giftCard.getRedemptionUrl() == null || giftCard.getRedemptionUrl().trim().isEmpty()) {
            throw new IllegalStateException("Redemption URL is required");
        }
        if (giftCard.getSource() == null || giftCard.getSource().trim().isEmpty()) {
            throw new IllegalStateException("Source is required");
        }

        // Save gift card first to get its ID
        try {
            giftCard = giftCardRepository.save(giftCard);
        } catch (Exception e) {
            log.error("Failed to save gift card: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to save gift card: " + e.getMessage(), e);
        }

        // Mark pool card as assigned
        log.info("Marking pool card {} as assigned to gift card {}", poolCard.getId(), giftCard.getId());
        int updated = giftCardPoolRepository.markAssigned(poolCard.getId(), giftCard.getId());
        log.info("Pool card marked as assigned - {} rows updated", updated);

        // Validate delivery method requirements
        if ("EMAIL".equals(request.getDeliveryMethod()) && (participant.getEmail() == null || participant.getEmail().trim().isEmpty())) {
            throw new IllegalArgumentException("Cannot send via email - participant does not have an email address");
        }
        
        if ("SMS".equals(request.getDeliveryMethod()) && (participant.getPhone() == null || participant.getPhone().trim().isEmpty())) {
            throw new IllegalArgumentException("Cannot send via SMS - participant does not have a phone number");
        }
        
        if ("BOTH".equals(request.getDeliveryMethod())) {
            boolean hasEmail = participant.getEmail() != null && !participant.getEmail().trim().isEmpty();
            boolean hasPhone = participant.getPhone() != null && !participant.getPhone().trim().isEmpty();
            if (!hasEmail && !hasPhone) {
                throw new IllegalArgumentException("Cannot send via BOTH - participant has neither email nor phone number");
            }
        }

        // Send via email/SMS
        boolean emailSent = false;
        boolean smsSent = false;

        if ("EMAIL".equals(request.getDeliveryMethod()) || "BOTH".equals(request.getDeliveryMethod())) {
            if (participant.getEmail() != null && !participant.getEmail().trim().isEmpty()) {
                emailSent = sendGiftCardEmail(giftCard);
            }
        }

        if ("SMS".equals(request.getDeliveryMethod()) || "BOTH".equals(request.getDeliveryMethod())) {
            if (participant.getPhone() != null && !participant.getPhone().trim().isEmpty()) {
                smsSent = sendGiftCardSms(giftCard);
            }
        }

        // Log the sending
        if (emailSent || "EMAIL".equals(request.getDeliveryMethod()) || "BOTH".equals(request.getDeliveryMethod())) {
            logDistributionAction(giftCard.getId(), DistributionAction.EMAIL_SENT, adminUsername, 
                    Map.of("email_sent", emailSent, "delivery_method", request.getDeliveryMethod()));
        }
        
        if (smsSent || "SMS".equals(request.getDeliveryMethod()) || "BOTH".equals(request.getDeliveryMethod())) {
            logDistributionAction(giftCard.getId(), DistributionAction.SMS_SENT, adminUsername, 
                    Map.of("sms_sent", smsSent, "delivery_method", request.getDeliveryMethod()));
        }

        return convertToDto(giftCard);
    }

    @Override
    public Page<GiftCardDto> getAllGiftCards(Pageable pageable) {
        log.info("Getting all gift cards");
        Page<GiftCard> giftCards = giftCardRepository.findAllByOrderByCreatedAtDesc(pageable);
        log.info("Found {} gift cards", giftCards.getTotalElements());

        return giftCards.map(this::convertToDto);
    }

    @Override
    public Page<GiftCardDto> getGiftCardsByStatus(GiftCardStatus status, Pageable pageable) {
        log.info("Getting gift cards with status: {}", status);
        Page<GiftCard> giftCards = giftCardRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        log.info("Found {} gift cards with status {}", giftCards.getTotalElements(), status);

        return giftCards.map(this::convertToDto);
    }

    @Override
    public Page<GiftCardDto> getGiftCards(GiftCardStatus status, String participantPhone,
                                         String sentBy, OffsetDateTime fromDate, OffsetDateTime toDate, Pageable pageable) {
        log.info("Getting gift cards with filters: status={}, sentBy={}, fromDate={}, toDate={}", status, sentBy, fromDate, toDate);
        Page<GiftCard> giftCards = giftCardRepository.findWithFilters(status, participantPhone,
                sentBy, fromDate, toDate, pageable);
        log.info("Found {} gift cards", giftCards.getTotalElements());

        return giftCards.map(this::convertToDto);
    }

    @Override
    public GiftCardDto getGiftCardById(UUID giftCardId) {
        GiftCard giftCard = giftCardRepository.findById(giftCardId)
                .orElseThrow(() -> new NotFoundException("Gift card not found: " + giftCardId));
        
        return convertToDto(giftCard);
    }

    @Override
    @Transactional
    public GiftCardDto resendGiftCard(UUID giftCardId, String adminUsername) {
        GiftCard giftCard = giftCardRepository.findById(giftCardId)
                .orElseThrow(() -> new NotFoundException("Gift card not found: " + giftCardId));

        // Resend via email/SMS
        boolean emailSent = sendGiftCardEmail(giftCard);
        boolean smsSent = sendGiftCardSms(giftCard);

        // Log the resend
        logDistributionAction(giftCard.getId(), DistributionAction.RESENT, adminUsername, 
                Map.of("email_sent", emailSent, "sms_sent", smsSent));

        return convertToDto(giftCard);
    }

    @Override
    @Transactional
    public void addNotes(UUID giftCardId, String notes, String adminUsername) {
        GiftCard giftCard = giftCardRepository.findById(giftCardId)
                .orElseThrow(() -> new NotFoundException("Gift card not found: " + giftCardId));

        giftCard.setNotes(notes);
        giftCardRepository.save(giftCard);

        // Log the notes addition
        logDistributionAction(giftCardId, DistributionAction.ADMIN_NOTES, adminUsername, 
                Map.of("notes", notes));
    }

    @Override
    @Transactional
    public void updateDeliveryStatus(UUID giftCardId, String method, String status) {
        GiftCard giftCard = giftCardRepository.findById(giftCardId)
                .orElseThrow(() -> new NotFoundException("Gift card not found: " + giftCardId));

        DistributionAction action = null;
        if ("EMAIL".equals(method)) {
            action = "delivered".equals(status) ? DistributionAction.EMAIL_DELIVERED : DistributionAction.EMAIL_FAILED;
        } else if ("SMS".equals(method)) {
            action = "delivered".equals(status) ? DistributionAction.SMS_DELIVERED : DistributionAction.SMS_FAILED;
        }

        if (action != null) {
            logDistributionAction(giftCardId, action, "SYSTEM", 
                    Map.of("method", method, "status", status));

            if ("delivered".equals(status)) {
                giftCard.setDeliveredAt(OffsetDateTime.now());
                giftCard.setStatus(GiftCardStatus.DELIVERED);
                giftCardRepository.save(giftCard);
            }
        }
    }

    @Override
    public List<DistributionLogDto> getDistributionLogs(UUID giftCardId) {
        List<GiftCardDistributionLog> logs = distributionLogRepository.findByGiftCardIdOrderByCreatedAtDesc(giftCardId);
        
        return logs.stream().map(log -> new DistributionLogDto(
                log.getId(),
                log.getGiftCard().getId(),
                log.getAction(),
                log.getPerformedBy(),
                log.getDetails(),
                log.getCreatedAt()
        )).collect(Collectors.toList());
    }

    // Default Amazon redemption URL
    private static final String DEFAULT_REDEMPTION_URL = "https://www.amazon.com/gc/redeem";
    
    // Pattern for validating Amazon gift card codes (XXXX-XXXXXX-XXXX format)
    private static final java.util.regex.Pattern GIFT_CARD_CODE_PATTERN = 
            java.util.regex.Pattern.compile("^[A-Z0-9]{4}-[A-Z0-9]{6}-[A-Z0-9]{4}$", java.util.regex.Pattern.CASE_INSENSITIVE);

    @Override
    @Transactional
    public UploadResultDto uploadGiftCards(MultipartFile file, String batchLabel, String adminUsername) {
        List<String> errors = new ArrayList<>();
        int successfulUploads = 0;
        int totalRows = 0;

        try {
            // Read file as lines - supports both plain text (one code per line) and single-column CSV
            List<String> lines = new java.io.BufferedReader(new InputStreamReader(file.getInputStream()))
                    .lines()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty())
                    .collect(Collectors.toList());
            
            totalRows = lines.size();
            
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i);
                int lineNumber = i + 1;
                
                try {
                    // Extract the code - handle CSV format (might have quotes or extra columns)
                    String cardCode = line.split(",")[0].trim().replace("\"", "").toUpperCase();
                    
                    // Skip header row if present
                    if (i == 0 && (cardCode.equalsIgnoreCase("code") || 
                                   cardCode.equalsIgnoreCase("card_code") || 
                                   cardCode.equalsIgnoreCase("gift_card_code"))) {
                        totalRows--; // Don't count header in total
                        continue;
                    }
                    
                    // Validate code format
                    if (!GIFT_CARD_CODE_PATTERN.matcher(cardCode).matches()) {
                        errors.add("Line " + lineNumber + ": Invalid code format '" + cardCode + "'. Expected format: XXXX-XXXXXX-XXXX");
                        continue;
                    }
                    
                    // Check for duplicates
                    if (giftCardPoolRepository.existsByCardCode(cardCode)) {
                        errors.add("Line " + lineNumber + ": Duplicate code: " + cardCode);
                        continue;
                    }

                    GiftCardPool poolCard = new GiftCardPool();
                    poolCard.setCardCode(cardCode);
                    poolCard.setCardType(null);  // Optional - not needed for simple import
                    poolCard.setCardValue(null); // Optional - amount unknown
                    poolCard.setRedemptionUrl(DEFAULT_REDEMPTION_URL);
                    poolCard.setBatchLabel(batchLabel); // Can be null
                    poolCard.setUploadedBy(adminUsername);
                    poolCard.setStatus(PoolStatus.AVAILABLE);
                    poolCard.setExpiresAt(null); // No expiration

                    giftCardPoolRepository.save(poolCard);
                    successfulUploads++;

                } catch (Exception e) {
                    errors.add("Line " + lineNumber + ": " + e.getMessage());
                }
            }

        } catch (IOException e) {
            errors.add("File processing error: " + e.getMessage());
        }

        return new UploadResultDto(totalRows, successfulUploads, totalRows - successfulUploads, 
                errors, batchLabel, adminUsername);
    }

    @Override
    @Transactional
    public GiftCardPoolDto addGiftCardToPool(AddGiftCardRequest request, String adminUsername) {
        // Check for duplicates
        if (giftCardPoolRepository.existsByCardCode(request.getCardCode())) {
            throw new IllegalArgumentException("Gift card code already exists: " + request.getCardCode());
        }

        GiftCardPool poolCard = new GiftCardPool();
        poolCard.setCardCode(request.getCardCode());
        poolCard.setCardType(request.getCardType());
        poolCard.setCardValue(request.getCardValue());
        poolCard.setRedemptionUrl(request.getRedemptionUrl());
        poolCard.setRedemptionInstructions(request.getRedemptionInstructions());
        poolCard.setBatchLabel(request.getBatchLabel());
        poolCard.setUploadedBy(adminUsername);
        poolCard.setStatus(PoolStatus.AVAILABLE);
        poolCard.setExpiresAt(request.getExpiresAt());

        poolCard = giftCardPoolRepository.save(poolCard);

        return convertPoolToDto(poolCard);
    }

    @Override
    public PoolStatusDto getPoolStatus() {
        long totalCards = giftCardPoolRepository.count();
        long availableCards = giftCardPoolRepository.countByStatus(PoolStatus.AVAILABLE);
        long assignedCards = giftCardPoolRepository.countByStatus(PoolStatus.ASSIGNED);
        long expiredCards = giftCardPoolRepository.countByStatus(PoolStatus.EXPIRED);
        long invalidCards = giftCardPoolRepository.countByStatus(PoolStatus.INVALID);

        // Get cards by type
        Map<String, Long> cardsByType = new HashMap<>();
        for (GiftCardType type : GiftCardType.values()) {
            cardsByType.put(type.name(), giftCardPoolRepository.countAvailableByTypeAndValue(type, BigDecimal.ZERO));
        }

        return new PoolStatusDto(totalCards, availableCards, assignedCards, expiredCards, invalidCards, 
                cardsByType, new HashMap<>());
    }

    @Override
    public Page<GiftCardPoolDto> getAvailableGiftCards(Pageable pageable) {
        Page<GiftCardPool> poolCards = giftCardPoolRepository.findAvailable(pageable);
        return poolCards.map(this::convertPoolToDto);
    }

    @Override
    public Page<GiftCardPoolDto> getGiftCardsFromPool(PoolStatus status, Pageable pageable) {
        Page<GiftCardPool> poolCards;
        if (status == null) {
            poolCards = giftCardPoolRepository.findAllOrdered(pageable);
        } else {
            poolCards = giftCardPoolRepository.findByStatus(status, pageable);
        }
        return poolCards.map(this::convertPoolToDto);
    }

    @Override
    public Page<GiftCardPoolDto> getGiftCardsByBatch(String batchLabel, Pageable pageable) {
        Page<GiftCardPool> poolCards = giftCardPoolRepository.findAvailableByBatch(batchLabel, pageable);
        return poolCards.map(this::convertPoolToDto);
    }

    @Override
    public byte[] exportUsedGiftCards() {
        // TODO: Implement CSV export
        return new byte[0];
    }

    @Override
    @Transactional
    public GiftCardPoolDto updateGiftCardInPool(UUID poolId, UpdateGiftCardRequest request, String adminUsername) {
        GiftCardPool poolCard = giftCardPoolRepository.findById(poolId)
                .orElseThrow(() -> new NotFoundException("Gift card not found in pool: " + poolId));
        
        // Check if code is being changed and if new code already exists
        if (request.getCardCode() != null && !request.getCardCode().trim().isEmpty()) {
            String newCode = request.getCardCode().trim().toUpperCase();
            
            // If code is different, check for duplicates
            if (!newCode.equals(poolCard.getCardCode())) {
                if (giftCardPoolRepository.existsByCardCode(newCode)) {
                    throw new IllegalArgumentException("Gift card code already exists: " + newCode);
                }
                poolCard.setCardCode(newCode);
            }
        }
        
        giftCardPoolRepository.save(poolCard);
        return convertPoolToDto(poolCard);
    }

    @Override
    @Transactional
    public void deleteGiftCardFromPool(UUID poolId, String adminUsername) {
        GiftCardPool poolCard = giftCardPoolRepository.findById(poolId)
                .orElseThrow(() -> new NotFoundException("Gift card not found in pool: " + poolId));

        if (poolCard.getStatus() == PoolStatus.ASSIGNED) {
            throw new IllegalStateException("Cannot delete assigned gift card. Please unassign first.");
        }

        // No logging needed for pool deletions - these are never sent to participants
        giftCardPoolRepository.delete(poolCard);
        
        log.info("Gift card {} deleted from pool by admin {}", poolCard.getCardCode(), adminUsername);
    }

    @Override
    @Transactional
    public void unsendGiftCard(UUID giftCardId, String adminUsername) {
        log.info("Unsending gift card: {} by admin: {}", giftCardId, adminUsername);
        
        GiftCard giftCard = giftCardRepository.findById(giftCardId)
                .orElseThrow(() -> new NotFoundException("Gift card not found: " + giftCardId));

        if (giftCard.getStatus() == GiftCardStatus.REDEEMED) {
            throw new IllegalStateException("Cannot unsend redeemed gift card.");
        }

        if (giftCard.getStatus() == GiftCardStatus.UNSENT) {
            throw new IllegalStateException("Gift card is already unsent.");
        }

        // Capture participant info BEFORE any modifications (in case participant gets deleted)
        Participant participant = giftCard.getParticipant();
        String participantPhone = participant != null ? participant.getPhone() : "Unknown";
        String participantEmail = participant != null ? participant.getEmail() : null;
        String participantName = participant != null ? participant.getName() : null;

        // If gift card was from pool, mark pool card as available again
        if (giftCard.getPoolId() != null) {
            giftCardPoolRepository.findById(giftCard.getPoolId()).ifPresent(poolCard -> {
                poolCard.setStatus(PoolStatus.AVAILABLE);
                poolCard.setAssignedAt(null);
                poolCard.setAssignedToGiftCardId(null);
                giftCardPoolRepository.save(poolCard);
            });
        }

        // Log the UNSENT action with details (using captured participant info)
        Map<String, Object> details = new HashMap<>();
        details.put("card_code", giftCard.getCardCode());
        details.put("card_type", giftCard.getCardType());
        details.put("card_value", giftCard.getCardValue());
        details.put("previous_status", giftCard.getStatus());
        details.put("participant_phone", participantPhone);
        if (participantEmail != null) {
            details.put("participant_email", participantEmail);
        }
        if (participantName != null) {
            details.put("participant_name", participantName);
        }
        if (giftCard.getPoolId() != null) {
            details.put("pool_id", giftCard.getPoolId().toString());
        }
        if (giftCard.getSentAt() != null) {
            details.put("sent_at", giftCard.getSentAt().toString());
        }
        if (giftCard.getSentBy() != null) {
            details.put("sent_by", giftCard.getSentBy());
        }
        details.put("source", giftCard.getSource());

        logDistributionAction(giftCardId, DistributionAction.UNSENT, adminUsername, details);

        // Mark the gift card as UNSENT instead of deleting it
        // IMPORTANT: Do NOT set participant or invitation to null - keep the references
        // The database requires participant_id and invitation_id to be NOT NULL
        giftCard.setStatus(GiftCardStatus.UNSENT);
        giftCardRepository.save(giftCard);
        
        log.info("Gift card {} unsent by admin {}", giftCard.getCardCode(), adminUsername);
    }

    @Override
    public boolean hasGiftCardForInvitation(UUID invitationId) {
        List<GiftCard> giftCards = giftCardRepository.findByInvitationId(invitationId);
        // Check if there's any gift card that's not UNSENT
        return giftCards.stream()
                .anyMatch(gc -> gc.getStatus() != GiftCardStatus.UNSENT);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UnsentGiftCardDto> getUnsentGiftCards(Pageable pageable) {
        // Find gift cards that have ever been unsent (have UNSENT distribution log)
        Page<GiftCardDistributionLog> unsentLogs = distributionLogRepository.findByActionOrderByCreatedAtDesc(
                DistributionAction.UNSENT, pageable);

        return unsentLogs.map(unsentLog -> {
            UnsentGiftCardDto dto = new UnsentGiftCardDto();
            
            // Extract all data from distribution log details to avoid Hibernate issues
            Map<String, Object> details = unsentLog.getDetails();
            
            dto.setCardCode((String) details.get("card_code"));
            dto.setCardType((String) details.get("card_type"));
            
            // Handle BigDecimal conversion from Double
            Object cardValueObj = details.get("card_value");
            if (cardValueObj instanceof Double) {
                dto.setCardValue(BigDecimal.valueOf((Double) cardValueObj));
            } else if (cardValueObj instanceof BigDecimal) {
                dto.setCardValue((BigDecimal) cardValueObj);
            } else if (cardValueObj instanceof Number) {
                dto.setCardValue(BigDecimal.valueOf(((Number) cardValueObj).doubleValue()));
            }
            
            dto.setStatus((String) details.get("previous_status")); // Use previous status from details
            dto.setParticipantPhone((String) details.get("participant_phone"));
            dto.setParticipantEmail((String) details.get("participant_email"));
            dto.setParticipantName((String) details.get("participant_name"));
            // Extract additional data from details
            if (details.get("sent_at") != null) {
                dto.setSentAt(details.get("sent_at").toString());
            }
            dto.setSentBy((String) details.get("sent_by"));
            dto.setSource((String) details.get("source"));
            if (details.get("pool_id") != null) {
                dto.setPoolId(details.get("pool_id").toString());
            }
            
            // Use the unsent log we already have
            dto.setUnsentBy(unsentLog.getPerformedBy());
            dto.setUnsentAt(unsentLog.getCreatedAt());
            dto.setDetails(unsentLog.getDetails());
            
            return dto;
        });
    }

    // Helper methods
    private boolean sendGiftCardEmail(GiftCard giftCard) {
        try {
            String subject = "Your Gift Card - Howard Research Study";
            String htmlContent = buildGiftCardEmailHtml(giftCard);
            
            String email = giftCard.getParticipant().getEmail();
            String name = giftCard.getParticipant().getName();
            
            if (email == null || email.trim().isEmpty()) {
                log.warn("Cannot send email - participant has no email address");
                return false;
            }
            
            return emailService.sendGiftCard(email, name, subject, htmlContent);
        } catch (Exception e) {
            log.error("Failed to send gift card email: {}", e.getMessage(), e);
            return false;
        }
    }

    private boolean sendGiftCardSms(GiftCard giftCard) {
        try {
            String phone = giftCard.getParticipant().getPhone();
            if (phone == null || phone.trim().isEmpty()) {
                log.warn("Cannot send SMS - participant has no phone number");
                return false;
            }
            
            String message = buildGiftCardSmsMessage(giftCard);
            Map<String, Object> result = smsService.send(phone, message);
            return Boolean.TRUE.equals(result.get("ok"));
        } catch (Exception e) {
            log.error("Failed to send gift card SMS: {}", e.getMessage(), e);
            return false;
        }
    }

    private String buildGiftCardEmailHtml(GiftCard giftCard) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Your Gift Card - Howard Research Study</title>
            </head>
            <body>
                <h2>Thank you for completing our survey!</h2>
                
                <p>Dear %s,</p>
                
                <p>As promised, here is your $%s %s gift card:</p>
                
                <div style="border: 2px solid #ff9900; padding: 20px; margin: 20px 0; text-align: center;">
                    <h3>🎁 Your %s Gift Card</h3>
                    <p><strong>Code:</strong> %s</p>
                    <p><strong>Value:</strong> $%s</p>
                    <p><strong>Expires:</strong> %s</p>
                    
                    <a href="%s" 
                       style="background-color: #ff9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
                        Redeem Your Gift Card
                    </a>
                </div>
                
                <p><strong>How to redeem:</strong></p>
                <ol>
                    <li>Click the "Redeem Your Gift Card" button above</li>
                    <li>Or visit <a href="%s">%s</a></li>
                    <li>Enter your gift card code: <strong>%s</strong></li>
                    <li>Start shopping!</li>
                </ol>
                
                <p>If you have any questions, please contact us at (240) 428-8442.</p>
                
                <p>Thank you for participating in our research!</p>
                <p>The Howard Research Team</p>
            </body>
            </html>
            """, 
            giftCard.getParticipant().getName() != null ? giftCard.getParticipant().getName() : "Participant",
            giftCard.getCardValue() != null ? giftCard.getCardValue().toString() : "N/A",
            giftCard.getCardType() != null ? giftCard.getCardType().toString() : "AMAZON",
            giftCard.getCardType() != null ? giftCard.getCardType().toString() : "AMAZON",
            giftCard.getCardCode() != null ? giftCard.getCardCode() : "",
            giftCard.getCardValue() != null ? giftCard.getCardValue().toString() : "N/A",
            giftCard.getExpiresAt() != null ? giftCard.getExpiresAt().toString() : "No expiration",
            giftCard.getRedemptionUrl() != null ? giftCard.getRedemptionUrl() : DEFAULT_REDEMPTION_URL,
            giftCard.getRedemptionUrl() != null ? giftCard.getRedemptionUrl() : DEFAULT_REDEMPTION_URL,
            giftCard.getRedemptionUrl() != null ? giftCard.getRedemptionUrl() : DEFAULT_REDEMPTION_URL,
            giftCard.getCardCode() != null ? giftCard.getCardCode() : ""
        );
    }

    private String buildGiftCardSmsMessage(GiftCard giftCard) {
        String cardValue = giftCard.getCardValue() != null ? giftCard.getCardValue().toString() : "N/A";
        String cardType = giftCard.getCardType() != null ? giftCard.getCardType().toString() : "AMAZON";
        String cardCode = giftCard.getCardCode() != null ? giftCard.getCardCode() : "";
        String redemptionUrl = giftCard.getRedemptionUrl() != null ? giftCard.getRedemptionUrl() : DEFAULT_REDEMPTION_URL;
        String expiresAt = giftCard.getExpiresAt() != null ? giftCard.getExpiresAt().toString() : "No expiration";
        
        return String.format("""
            🎁 Your $%s %s gift card is ready!
            
            Code: %s
            Redeem: %s
            
            Expires: %s
            
            Questions? Call (240) 428-8442
            """,
            cardValue,
            cardType,
            cardCode,
            redemptionUrl,
            expiresAt
        );
    }

    private void logDistributionAction(UUID giftCardId, DistributionAction action, String performedBy, Map<String, Object> details) {
        GiftCardDistributionLog distributionLog = new GiftCardDistributionLog();
        GiftCard giftCard = new GiftCard();
        giftCard.setId(giftCardId);
        distributionLog.setGiftCard(giftCard);
        distributionLog.setAction(action);
        distributionLog.setPerformedBy(performedBy);
        distributionLog.setDetails(details);
        
        distributionLogRepository.save(distributionLog);
        log.debug("Logged {} action for gift card: {}", action, giftCardId);
    }

    private GiftCardDto convertToDto(GiftCard giftCard) {
        return new GiftCardDto(
                giftCard.getId(),
                giftCard.getParticipant().getId(),
                giftCard.getParticipant().getName(),
                giftCard.getParticipant().getPhone(),
                giftCard.getParticipant().getEmail(),
                giftCard.getInvitation() != null ? giftCard.getInvitation().getId() : null,
                giftCard.getInvitation() != null ? giftCard.getInvitation().getLinkUrl() : null,
                giftCard.getCardCode(),
                giftCard.getCardType(),
                giftCard.getCardValue(),
                giftCard.getRedemptionUrl(),
                giftCard.getRedemptionInstructions(),
                giftCard.getStatus(),
                giftCard.getSentBy(),
                giftCard.getSentAt(),
                giftCard.getDeliveredAt(),
                giftCard.getRedeemedAt(),
                giftCard.getExpiresAt(),
                giftCard.getNotes(),
                giftCard.getSource(),
                giftCard.getPoolId(),
                giftCard.getCreatedAt(),
                giftCard.getUpdatedAt()
        );
    }

    private GiftCardPoolDto convertPoolToDto(GiftCardPool poolCard) {
        return new GiftCardPoolDto(
                poolCard.getId(),
                poolCard.getCardCode(),
                poolCard.getCardType(),
                poolCard.getCardValue(),
                poolCard.getRedemptionUrl(),
                poolCard.getRedemptionInstructions(),
                poolCard.getStatus(),
                poolCard.getBatchLabel(),
                poolCard.getUploadedBy(),
                poolCard.getUploadedAt(),
                poolCard.getExpiresAt(),
                poolCard.getAssignedAt(),
                poolCard.getAssignedToGiftCardId()
        );
    }
}
