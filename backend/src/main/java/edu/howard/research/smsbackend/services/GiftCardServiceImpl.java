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

        // Update gift card details
        giftCard.setCardCode(request.getCardCode());
        giftCard.setCardType(request.getCardType());
        giftCard.setCardValue(request.getCardValue());
        giftCard.setRedemptionUrl(request.getRedemptionUrl());
        giftCard.setRedemptionInstructions(request.getRedemptionInstructions());
        giftCard.setExpiresAt(request.getExpiresAt());
        giftCard.setNotes(request.getNotes());
        giftCard.setSource(request.getSource());
        giftCard.setPoolId(request.getPoolId());
        giftCard.setSentBy(adminUsername);
        giftCard.setSentAt(OffsetDateTime.now());
        giftCard.setStatus(GiftCardStatus.SENT);

        // Save gift card first to get its ID
        giftCard = giftCardRepository.save(giftCard);

        // If from pool, mark pool card as assigned
        log.info("Checking pool assignment - source: {}, poolId: {}", request.getSource(), request.getPoolId());
        if ("POOL".equals(request.getSource()) && request.getPoolId() != null) {
            log.info("Marking pool card {} as assigned to gift card {}", request.getPoolId(), giftCard.getId());
            int updated = giftCardPoolRepository.markAssigned(request.getPoolId(), giftCard.getId());
            log.info("Pool card marked as assigned - {} rows updated", updated);
        } else {
            log.info("Not from pool - source: {}, poolId: {}", request.getSource(), request.getPoolId());
        }

        // Send via email/SMS
        boolean emailSent = false;
        boolean smsSent = false;

        if ("EMAIL".equals(request.getDeliveryMethod()) || "BOTH".equals(request.getDeliveryMethod())) {
            emailSent = sendGiftCardEmail(giftCard);
        }

        if ("SMS".equals(request.getDeliveryMethod()) || "BOTH".equals(request.getDeliveryMethod())) {
            smsSent = sendGiftCardSms(giftCard);
        }

        // Log the sending
        logDistributionAction(giftCard.getId(), DistributionAction.EMAIL_SENT, adminUsername, 
                Map.of("email_sent", emailSent, "delivery_method", request.getDeliveryMethod()));
        
        if (smsSent) {
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

    @Override
    @Transactional
    public UploadResultDto uploadGiftCards(MultipartFile file, String batchLabel, String adminUsername) {
        List<String> errors = new ArrayList<>();
        int successfulUploads = 0;
        int totalRows = 0;

        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            List<String[]> rows = reader.readAll();
            // totalRows should only count data rows, not the header
            totalRows = rows.size() > 0 ? rows.size() - 1 : 0;

            for (int i = 1; i < rows.size(); i++) { // Skip header
                String[] row = rows.get(i);
                try {
                    if (row.length < 4) {
                        errors.add("Row " + (i + 1) + ": Insufficient columns (need at least: card_code, card_type, card_value, redemption_url)");
                        continue;
                    }

                    String cardCode = row[0].trim();
                    GiftCardType cardType = GiftCardType.valueOf(row[1].trim().toUpperCase());
                    BigDecimal cardValue = new BigDecimal(row[2].trim());
                    String redemptionUrl = row[3].trim();
                    
                    // Parse date from separate columns (expires_day, expires_month, expires_year) or single expires_at column
                    OffsetDateTime expiresAt = null;
                    
                    // Check if we have the new format (7+ columns with separate day/month/year)
                    if (row.length >= 7) {
                        // New format: separate day, month, year columns
                        String expiresDayStr = row[4].trim();
                        String expiresMonthStr = row[5].trim();
                        String expiresYearStr = row[6].trim();
                        
                        // Only parse if all three date fields are provided and non-empty
                        if (!expiresDayStr.isEmpty() && !expiresMonthStr.isEmpty() && !expiresYearStr.isEmpty()) {
                            try {
                                int day = Integer.parseInt(expiresDayStr);
                                int month = Integer.parseInt(expiresMonthStr);
                                int year = Integer.parseInt(expiresYearStr);
                                
                                // Validate date values
                                if (month < 1 || month > 12) {
                                    errors.add("Row " + (i + 1) + ": Invalid month (must be 1-12): " + month);
                                    continue;
                                }
                                if (day < 1 || day > 31) {
                                    errors.add("Row " + (i + 1) + ": Invalid day (must be 1-31): " + day);
                                    continue;
                                }
                                if (year < 2000 || year > 2100) {
                                    errors.add("Row " + (i + 1) + ": Invalid year (must be 2000-2100): " + year);
                                    continue;
                                }
                                
                                // Create OffsetDateTime at end of day in UTC
                                try {
                                    expiresAt = OffsetDateTime.of(year, month, day, 23, 59, 59, 0, java.time.ZoneOffset.UTC);
                                } catch (java.time.DateTimeException e) {
                                    errors.add("Row " + (i + 1) + ": Invalid date (e.g., February 30th doesn't exist): " + month + "/" + day + "/" + year);
                                    continue;
                                }
                            } catch (NumberFormatException e) {
                                errors.add("Row " + (i + 1) + ": Invalid date format. Day, month, and year must be numbers. Got: day='" + expiresDayStr + "', month='" + expiresMonthStr + "', year='" + expiresYearStr + "'");
                                continue;
                            }
                        }
                        // If date columns are empty, expiresAt remains null (no expiration)
                    } else if (row.length == 5) {
                        // Legacy format: single expires_at column (ISO-8601 format)
                        String expiresAtStr = row[4].trim();
                        if (!expiresAtStr.isEmpty()) {
                            try {
                                expiresAt = OffsetDateTime.parse(expiresAtStr);
                            } catch (Exception e) {
                                errors.add("Row " + (i + 1) + ": Invalid date format. Use separate day/month/year columns (7 columns) or ISO-8601 format (5 columns). Error: " + e.getMessage());
                                continue;
                            }
                        }
                    }
                    // If row.length is 4, no expiration date (expiresAt remains null)

                    // Check for duplicates
                    if (giftCardPoolRepository.existsByCardCode(cardCode)) {
                        errors.add("Row " + (i + 1) + ": Duplicate card code: " + cardCode);
                        continue;
                    }

                    GiftCardPool poolCard = new GiftCardPool();
                    poolCard.setCardCode(cardCode);
                    poolCard.setCardType(cardType);
                    poolCard.setCardValue(cardValue);
                    poolCard.setRedemptionUrl(redemptionUrl);
                    poolCard.setBatchLabel(batchLabel);
                    poolCard.setUploadedBy(adminUsername);
                    poolCard.setStatus(PoolStatus.AVAILABLE);
                    poolCard.setExpiresAt(expiresAt);

                    giftCardPoolRepository.save(poolCard);
                    successfulUploads++;

                } catch (Exception e) {
                    errors.add("Row " + (i + 1) + ": " + e.getMessage());
                }
            }

        } catch (IOException | CsvException e) {
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
            
            return emailService.sendGiftCard(giftCard.getParticipant().getEmail(), 
                    giftCard.getParticipant().getName(), subject, htmlContent);
        } catch (Exception e) {
            log.error("Failed to send gift card email: {}", e.getMessage());
            return false;
        }
    }

    private boolean sendGiftCardSms(GiftCard giftCard) {
        try {
            String message = buildGiftCardSmsMessage(giftCard);
            Map<String, Object> result = smsService.send(giftCard.getParticipant().getPhone(), message);
            return Boolean.TRUE.equals(result.get("ok"));
        } catch (Exception e) {
            log.error("Failed to send gift card SMS: {}", e.getMessage());
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
            giftCard.getCardValue(),
            giftCard.getCardType(),
            giftCard.getCardType(),
            giftCard.getCardCode(),
            giftCard.getCardValue(),
            giftCard.getExpiresAt() != null ? giftCard.getExpiresAt().toString() : "No expiration",
            giftCard.getRedemptionUrl(),
            giftCard.getRedemptionUrl(),
            giftCard.getRedemptionUrl(),
            giftCard.getCardCode()
        );
    }

    private String buildGiftCardSmsMessage(GiftCard giftCard) {
        return String.format("""
            🎁 Your $%s %s gift card is ready!
            
            Code: %s
            Redeem: %s
            
            Expires: %s
            
            Questions? Call (240) 428-8442
            """,
            giftCard.getCardValue(),
            giftCard.getCardType(),
            giftCard.getCardCode(),
            giftCard.getRedemptionUrl(),
            giftCard.getExpiresAt() != null ? giftCard.getExpiresAt().toString() : "No expiration"
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
