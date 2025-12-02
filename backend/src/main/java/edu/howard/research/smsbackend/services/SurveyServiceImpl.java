package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.SurveyCompletionWebhook;
import edu.howard.research.smsbackend.models.entities.Participant;
import edu.howard.research.smsbackend.models.entities.ParticipantStatus;
import edu.howard.research.smsbackend.models.entities.SmsEventLog;
import edu.howard.research.smsbackend.models.entities.SurveyInvitation;
import edu.howard.research.smsbackend.models.entities.SurveyLinkPool;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import edu.howard.research.smsbackend.repositories.SmsEventLogRepository;
import edu.howard.research.smsbackend.repositories.SurveyInvitationRepository;
import edu.howard.research.smsbackend.repositories.SurveyLinkPoolRepository;
import edu.howard.research.smsbackend.util.PhoneNumberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SurveyServiceImpl implements SurveyService {

    private final ParticipantRepository participantRepository;
    private final SurveyLinkPoolRepository linkPoolRepository;
    private final SurveyInvitationRepository invitationRepository;
    private final SmsEventLogRepository smsEventLogRepository;
    private final SmsService smsService;
    private final EmailService emailService;
    private final PhoneNumberService phoneNumberService;
    private final GiftCardService giftCardService;

    @Override
    @Transactional
    public AssignResult assignAndSendLink(String phone, @Nullable String batchLabel) {
        try {
            // 1) normalize & upsert/find participant
            final String e164 = phoneNumberService.normalizeToE164(phone);
            Participant p = participantRepository.findByPhone(e164)
                    .orElseGet(() -> {
                        Participant np = new Participant();
                        np.setPhone(e164);
                        np.setStatus(ParticipantStatus.SUBSCRIBED);
                        np.setPhoneVerified(true);
                        return participantRepository.save(np);
                    });

            if (!p.isPhoneVerified()) {
                p.setPhoneVerified(true);
                participantRepository.save(p);
            }
            if (p.getStatus() == ParticipantStatus.OPTED_OUT) {
                log.warn("Opted-out participant {}; not sending.", e164);
                return new AssignResult(false, "participant_error", null, null);
            }

            // 2) claim link
            Optional<SurveyLinkPoolRepository.ClaimResult> claim =
                    (batchLabel == null || batchLabel.isBlank())
                            ? linkPoolRepository.claimAny()
                            : linkPoolRepository.claimAvailable(batchLabel);
            if (claim.isEmpty()) {
                return new AssignResult(false, "no_links_available", null, null);
            }
            UUID linkId = claim.get().getLinkId();
            String linkUrl = claim.get().getLinkUrl();
            String shortLinkUrl = claim.get().getShortLinkUrl();

            SurveyLinkPool linkRef = new SurveyLinkPool();
            linkRef.setId(linkId);

            // 3) create invitation
            SurveyInvitation inv = new SurveyInvitation();
            inv.setParticipant(p);
            inv.setLink(linkRef);
            inv.setLinkUrl(linkUrl);
            inv.setShortLinkUrl(shortLinkUrl);
            inv = invitationRepository.save(inv);

            // 4) send SMS - use short link if available, otherwise use long link
            String linkToSend = (shortLinkUrl != null && !shortLinkUrl.isBlank()) ? shortLinkUrl : linkUrl;
            String body = "Here's the Howard University AI for Health survey link: " + linkToSend + ". You can pause and restart at any time. The survey MUST be completed within 10 days. Once done, we'll send your Amazon gift card. For questions, text/email us at (240) 428-8442.";
            Map<String, Object> send = smsService.send(e164, body);

            // 5) send email if participant has email address - use short link if available
            boolean emailSent = false;
            if (p.getEmail() != null && !p.getEmail().trim().isEmpty()) {
                emailSent = emailService.sendSurveyLink(p.getEmail(), p.getName(), linkToSend);
                log.info("Email sent to {} for participant {}: {}", p.getEmail(), e164, emailSent ? "SUCCESS" : "FAILED");
            }

            // 6) persist outcome
            boolean ok = Boolean.TRUE.equals(send.get("ok"));
            if (ok) {
                String sid = (String) send.get("sid");
                String status = (String) send.getOrDefault("status", "queued");

                invitationRepository.setQueued(
                        inv.getId(),
                        sid,
                        status,
                        OffsetDateTime.now()
                );
                // Return the link that was actually sent (short link if available)
                return new AssignResult(true, null, linkToSend, sid);
            } else {
                String error = (String) send.get("error");
                inv.setMessageStatus("failed");
                inv.setErrorCode(error);
                inv.setFailedAt(OffsetDateTime.now());
                invitationRepository.save(inv);
                // Return the link that was actually sent (short link if available)
                return new AssignResult(false, "sms_send_failed", linkToSend, null);
            }
        } catch (Exception ex) {
            log.error("assignAndSendLink error: {}", ex.getMessage(), ex);
            return new AssignResult(false, "participant_error", null, null);
        }
    }

    @Override
    @Transactional
    public void handleSmsStatus(String messageSid, String messageStatus, String errorCode, String rawPayloadJson) {
        // log raw webhook (store as JSONB map)
        SmsEventLog row = new SmsEventLog();
        row.setMessageSid(messageSid);
        row.setEventType(messageStatus);
        row.setPayload(Map.of(
                "raw", rawPayloadJson,
                "errorCode", errorCode == null ? "" : errorCode
        ));
        smsEventLogRepository.save(row);

        // update invitation status
        OffsetDateTime now = OffsetDateTime.now();
        switch (messageStatus == null ? "" : messageStatus) {
            case "delivered" -> invitationRepository.markDelivered(messageSid, now);
            case "failed"    -> invitationRepository.markFailed(messageSid, errorCode, now);
            case "sent"      -> invitationRepository.markSentIfUnset(messageSid);
            case "queued"    -> { /* already set at send-time */ }
            default          -> log.debug("Unhandled MessageStatus={}", messageStatus);
        }
    }

    @Override
    @Transactional
    public void handleSurveyCompletion(SurveyCompletionWebhook payload) {
        String url = payload == null ? null : payload.getUrl();
        if (url == null || url.isBlank()) {
            log.warn("Survey completion webhook missing URL. Payload={}", payload);
            SmsEventLog logRow = new SmsEventLog();
            logRow.setEventType("completed");
            logRow.setPayload(Map.of("raw", String.valueOf(payload)));
            smsEventLogRepository.save(logRow);
            return;
        }

        var opt = invitationRepository.findTopByLinkUrlOrderByCreatedAtDesc(url.trim());
        if (opt.isEmpty()) {
            log.warn("No invitation found for completed URL: {}", url);
            SmsEventLog logRow = new SmsEventLog();
            logRow.setEventType("completed");
            logRow.setPayload(Map.of(
                    "url", url,
                    "raw", String.valueOf(payload)
            ));
            smsEventLogRepository.save(logRow);
            return;
        }

        var inv = opt.get();
        var now = OffsetDateTime.now();

        int updated = invitationRepository.markCompletedById(inv.getId(), now);
        log.info("Marked invitation {} completed (updated={}) for url={}", inv.getId(), updated, url);

        if (inv.getLink() != null && inv.getLink().getId() != null) {
            try { linkPoolRepository.markExhausted(inv.getLink().getId()); }
            catch (Exception ex) { log.warn("Failed to mark link exhausted for invitation {}: {}", inv.getId(), ex.getMessage()); }
        }

        // Create pending gift card for the participant
        try {
            giftCardService.createPendingGiftCard(inv.getParticipant().getId(), inv.getId());
            log.info("Created pending gift card for participant {} and invitation {}", 
                    inv.getParticipant().getId(), inv.getId());
        } catch (Exception ex) {
            log.warn("Failed to create pending gift card for participant {} and invitation {}: {}", 
                    inv.getParticipant().getId(), inv.getId(), ex.getMessage());
        }

        SmsEventLog logRow = new SmsEventLog();
        logRow.setInvitation(inv);
        logRow.setMessageSid(inv.getMessageSid());
        logRow.setEventType("completed");
        logRow.setPayload(Map.of(
                "url", url,
                "raw", String.valueOf(payload)
        ));
        smsEventLogRepository.save(logRow);
    }
}
