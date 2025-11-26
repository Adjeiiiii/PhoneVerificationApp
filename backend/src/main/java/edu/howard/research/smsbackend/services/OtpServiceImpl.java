package edu.howard.research.smsbackend.services;

import com.twilio.exception.ApiException;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;
import edu.howard.research.smsbackend.models.dto.OtpCheckRequest;
import edu.howard.research.smsbackend.models.dto.OtpStartRequest;
import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.models.entities.ParticipantStatus;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class OtpServiceImpl implements OtpService {

    private final String verifyServiceSid;
    private final ParticipantRepository participantRepo;
    private final PhoneValidationService phoneValidationService;

    public OtpServiceImpl(
            @Value("${twilio.verifyServiceSid}") String verifyServiceSid,
            ParticipantRepository participantRepo,
            PhoneValidationService phoneValidationService
    ) {
        this.verifyServiceSid = verifyServiceSid;
        this.participantRepo = participantRepo;
        this.phoneValidationService = phoneValidationService;
    }

    @Override
    public Map<String, Object> start(OtpStartRequest req) {
        // Validate phone number is not VOIP before starting verification
        PhoneValidationService.ValidationResult validation = 
                phoneValidationService.validatePhoneNumber(req.getPhone());
        
        if (!validation.isValid()) {
            log.warn("Rejected OTP start for VOIP number: {}", req.getPhone());
            return Map.of(
                    "ok", false, 
                    "error", validation.getErrorMessage()
            );
        }

        try {
            Verification v = Verification
                    .creator(verifyServiceSid, req.getPhone(), req.getChannel())
                    .create();

            return Map.of(
                    "ok", true,
                    "sid", v.getSid(),
                    "to", v.getTo(),
                    "status", v.getStatus(),
                    "channel", req.getChannel()
            );
        } catch (ApiException e) {
            log.warn("Verify start failed: code={} msg={}", e.getCode(), e.getMessage());
            return Map.of("ok", false, "error", e.getMessage());
        }
    }

    @Override
    @Transactional
    public Map<String, Object> check(OtpCheckRequest req) {
        try {
            VerificationCheck check = VerificationCheck.creator(verifyServiceSid)
                    .setTo(req.getPhone())
                    .setCode(req.getCode())
                    .create();

            boolean approved = "approved".equalsIgnoreCase(check.getStatus());
            if (!approved) {
                return Map.of(
                        "verified", false,
                        "status", check.getStatus(),
                        "message", "Invalid or expired code."
                );
            }

            // Find or create participant
            Participant participant = participantRepo.findByPhone(req.getPhone()).orElseGet(() -> {
                log.info("Creating new participant for verified phone: {}", req.getPhone());
                Participant newParticipant = new Participant();
                newParticipant.setPhone(req.getPhone());
                newParticipant.setStatus(ParticipantStatus.SUBSCRIBED);
                newParticipant.setPhoneVerified(true);
                newParticipant.setVerifiedAt(OffsetDateTime.now());
                return participantRepo.save(newParticipant);
            });
            
            // Update participant with email and name if provided
            boolean updated = false;
            if (req.getEmail() != null && !req.getEmail().trim().isEmpty()) {
                participant.setEmail(req.getEmail().trim());
                updated = true;
            }
            if (req.getName() != null && !req.getName().trim().isEmpty()) {
                participant.setName(req.getName().trim());
                updated = true;
            }
            
            // Update verification status if not already verified
            if (!participant.isPhoneVerified()) {
                participant.setPhoneVerified(true);
                participant.setVerifiedAt(OffsetDateTime.now());
                updated = true;
            }
            
            if (updated) {
                participantRepo.save(participant);
                log.info("Updated participant {} with email: {}, name: {}", 
                        req.getPhone(), req.getEmail(), req.getName());
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("verified", true);
            resp.put("status", check.getStatus());
            resp.put("sid", check.getSid());
            return resp;

        } catch (ApiException e) {
            log.warn("Verify check failed: code={} msg={}", e.getCode(), e.getMessage());
            return Map.of("verified", false, "error", e.getMessage());
        }
    }
}
