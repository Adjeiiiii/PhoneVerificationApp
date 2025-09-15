package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.SurveyCompletionWebhook;
import org.springframework.lang.Nullable;

/**
 * Orchestrates survey link assignment + outbound SMS,
 * and processes provider/survey webhooks.
 */
public interface SurveyService {

    /**
     * Claim an available survey link (optionally scoped by batch),
     * create a SurveyInvitation, send the SMS, and persist the outcome.
     *
     * @param phone      phone number (any format; will be normalized to E.164)
     * @param batchLabel optional batch label to restrict link selection; null/blank means "any"
     * @return AssignResult with success flag, reason (when not ok), linkUrl, and messageSid (when ok)
     */
    AssignResult assignAndSendLink(String phone, @Nullable String batchLabel);

    /**
     * Handle Twilio delivery status webhooks.
     * Expected statuses: queued, sent, delivered, failed (others ignored).
     *
     * @param messageSid     Twilio Message SID (SM…)
     * @param messageStatus  provider status string
     * @param errorCode      optional Twilio error code (e.g., "30006")
     * @param rawPayloadJson raw payload (logged for traceability)
     */
    void handleSmsStatus(String messageSid, String messageStatus, String errorCode, String rawPayloadJson);

    /**
     * Handle survey platform completion webhook.
     * Marks the invitation completed and exhausts the link.
     */
    void handleSurveyCompletion(SurveyCompletionWebhook payload);

    /**
     * Result for assignAndSendLink.
     *  - ok=true: linkUrl + messageSid populated
     *  - ok=false: reason populated (e.g., "no_links_available", "sms_send_failed", "participant_error")
     */
    record AssignResult(boolean ok, String reason, String linkUrl, String messageSid) {}
}
