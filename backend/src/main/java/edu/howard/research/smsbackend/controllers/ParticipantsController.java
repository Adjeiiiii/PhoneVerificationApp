package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.SendSmsRequest;
import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import edu.howard.research.smsbackend.repositories.SurveyInvitationRepository;
import edu.howard.research.smsbackend.services.EmailService;
import edu.howard.research.smsbackend.services.PhoneValidationService;
import edu.howard.research.smsbackend.services.SmsService;
import edu.howard.research.smsbackend.services.SurveyService;
import edu.howard.research.smsbackend.util.PhoneNumberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/participants")
@RequiredArgsConstructor
@Slf4j
public class ParticipantsController {

    private final SurveyService surveyService;
    private final PhoneNumberService phoneNumberService;
    private final ParticipantRepository participantRepository;
    private final SurveyInvitationRepository invitationRepository;
    private final SmsService smsService;
    private final EmailService emailService;
    private final PhoneValidationService phoneValidationService;

    /**
     * Validate phone number type (check if VOIP)
     * Returns validation result indicating if phone is acceptable (mobile/landline)
     */
    @PostMapping("/validate-phone")
    public ResponseEntity<Map<String, Object>> validatePhone(@RequestBody Map<String, String> request) {
        try {
            String phone = request.get("phone");
            if (phone == null || phone.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "valid", false,
                    "error", "Phone number is required"
                ));
            }
            
            String normalizedPhone = phoneNumberService.normalizeToE164(phone);
            PhoneValidationService.ValidationResult validation = 
                    phoneValidationService.validatePhoneNumber(normalizedPhone);
            
            if (validation.isValid()) {
                return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "message", "Phone number is acceptable"
                ));
            } else {
                return ResponseEntity.ok(Map.of(
                    "valid", false,
                    "error", validation.getErrorMessage()
                ));
            }
        } catch (Exception e) {
            log.error("Error validating phone number: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "valid", false,
                "error", "Error validating phone number: " + e.getMessage()
            ));
        }
    }

    /**
     * Check if a participant is already verified
     * Returns participant info if verified, null if not
     */
    @GetMapping("/check-verification/{phone}")
    public ResponseEntity<Map<String, Object>> checkVerification(@PathVariable String phone) {
        try {
            String normalizedPhone = phoneNumberService.normalizeToE164(phone);
            Optional<Participant> participantOpt = participantRepository.findByPhone(normalizedPhone);
            
            if (participantOpt.isPresent()) {
                Participant participant = participantOpt.get();
                if (participant.isPhoneVerified()) {
                    return ResponseEntity.ok(Map.of(
                        "verified", true,
                        "participant", Map.of(
                            "phone", participant.getPhone(),
                            "email", participant.getEmail() != null ? participant.getEmail() : "",
                            "name", participant.getName() != null ? participant.getName() : "",
                            "verifiedAt", participant.getVerifiedAt() != null ? participant.getVerifiedAt().toString() : ""
                        ),
                        "message", "Phone number is already verified"
                    ));
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "verified", false,
                "message", "Phone number not verified yet"
            ));
            
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "verified", false,
                "error", "Error checking verification: " + e.getMessage()
            ));
        }
    }

    /**
     * User-facing endpoint to resend survey link
     * Requires phone number to be verified
     */
    @PostMapping("/resend-survey-link")
    public ResponseEntity<Map<String, Object>> resendSurveyLink(@Valid @RequestBody SendSmsRequest request) {
        try {
            String phone = phoneNumberService.normalizeToE164(request.getPhone());
            
            // Check if participant exists and has an existing invitation
            var participantOpt = participantRepository.findByPhone(phone);
            if (participantOpt.isPresent()) {
                var participant = participantOpt.get();
                
                // Find existing invitation for this participant
                var existingInvitation = invitationRepository.findActiveByParticipant(participant.getId());
                if (existingInvitation.isPresent()) {
                    var invitation = existingInvitation.get();
                    
                    // Refresh the invitation entity to ensure we have the latest data
                    invitation = invitationRepository.findById(invitation.getId()).orElse(invitation);
                    
                    // Check if this is a reminder (has been sent before) or first-time send
                    // If invitation was created more than a few minutes ago OR has been queued/sent, it's a reminder
                    boolean isReminder = invitation.getQueuedAt() != null 
                            || invitation.getSentAt() != null 
                            || (invitation.getCreatedAt() != null 
                                && invitation.getCreatedAt().isBefore(java.time.OffsetDateTime.now().minusMinutes(5)));
                    
                    log.info("Resending survey link for phone: {}, isReminder: {}, queuedAt: {}, sentAt: {}", 
                            phone, isReminder, invitation.getQueuedAt(), invitation.getSentAt());
                    
                    String linkToSend = (invitation.getShortLinkUrl() != null && !invitation.getShortLinkUrl().isBlank()) 
                            ? invitation.getShortLinkUrl() 
                            : invitation.getLinkUrl();
                    
                    // Personalized message based on whether it's a reminder or first-time
                    String body;
                    if (isReminder) {
                        // Reminder message - more friendly and encouraging
                        String participantName = participant.getName() != null && !participant.getName().trim().isEmpty() 
                                ? participant.getName() 
                                : "there";
                        body = String.format("Hi %s! Just a friendly reminder: Please complete the Howard University AI for Health survey. Your link: %s. You can pause and restart anytime. Complete within 10 days to receive your Amazon gift card. Questions? Text us at (240) 428-8442.", 
                                participantName, linkToSend);
                    } else {
                        // First-time message
                        body = "Here's the Howard University AI for Health survey link: " + linkToSend + ". You can pause and restart at any time. The survey MUST be completed within 10 days. Once done, we'll send your Amazon gift card. For questions, text/email us at (240) 428-8442.";
                    }
                    
                    Map<String, Object> send = smsService.send(phone, body);
                    
                    // Send email if participant has email address
                    boolean emailSent = false;
                    if (participant.getEmail() != null && !participant.getEmail().trim().isEmpty()) {
                        emailSent = emailService.sendSurveyLink(participant.getEmail(), participant.getName(), invitation.getLinkUrl());
                        log.info("Email resent to {} for participant {}: {}", participant.getEmail(), phone, emailSent ? "SUCCESS" : "FAILED");
                    }
                    
                    // Update invitation status
                    boolean ok = Boolean.TRUE.equals(send.get("ok"));
                    if (ok) {
                        String sid = (String) send.get("sid");
                        String status = (String) send.getOrDefault("status", "queued");
                        
                        invitation.setMessageSid(sid);
                        invitation.setMessageStatus(status);
                        invitation.setQueuedAt(java.time.OffsetDateTime.now());
                        invitationRepository.save(invitation);
                        
                        return ResponseEntity.ok(Map.of(
                            "ok", true,
                            "linkUrl", invitation.getLinkUrl(),
                            "message", isReminder ? "Reminder sent successfully!" : "Survey link sent successfully!"
                        ));
                    } else {
                        String error = (String) send.get("error");
                        invitation.setMessageStatus("failed");
                        invitation.setErrorCode(error);
                        invitation.setFailedAt(java.time.OffsetDateTime.now());
                        invitationRepository.save(invitation);
                        
                        return ResponseEntity.ok(Map.of(
                            "ok", false,
                            "error", "Failed to resend survey link: " + error
                        ));
                    }
                }
            }
            
            // If no existing invitation, create a new one
            var result = surveyService.assignAndSendLink(phone, null);
            
            if (result.ok()) {
                return ResponseEntity.ok(Map.of(
                    "ok", true,
                    "linkUrl", result.linkUrl(),
                    "message", "Survey link sent successfully!"
                ));
            } else {
                // Check if it's a "no links available" error
                if ("no_links_available".equals(result.reason())) {
                    return ResponseEntity.ok(Map.of(
                        "ok", false,
                        "error", "no_links_available",
                        "message", "No survey links are currently available. Please contact the administrator or try again later."
                    ));
                } else {
                    return ResponseEntity.ok(Map.of(
                        "ok", false,
                        "error", result.reason() != null ? result.reason() : "unknown_error",
                        "message", "Failed to send survey link: " + (result.reason() != null ? result.reason() : "Unknown error")
                    ));
                }
            }
        } catch (Exception e) {
            log.error("Error in resend survey link: {}", e.getMessage(), e);
            return ResponseEntity.ok(Map.of(
                "ok", false,
                "error", "Error: " + e.getMessage()
            ));
        }
    }
}