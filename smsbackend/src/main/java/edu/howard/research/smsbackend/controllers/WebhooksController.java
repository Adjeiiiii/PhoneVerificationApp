package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.SmsStatusWebhook;
import edu.howard.research.smsbackend.models.dto.SurveyCompletionWebhook;
import edu.howard.research.smsbackend.services.SurveyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class WebhooksController {

    private final SurveyService surveyService;

    // -------- Survey platform webhook --------
    // POST /api/system/webhooks/survey/completed
    @PostMapping("/webhooks/survey/completed")
    public String onSurveyCompleted(@RequestBody SurveyCompletionWebhook payload) {
        surveyService.handleSurveyCompletion(payload);
        return "OK";
    }

    // -------- Messaging provider webhook --------
    // POST /api/system/webhooks/provider/sms-status
    @PostMapping("/webhooks/provider/sms-status")
    public String onSmsStatus(@RequestBody SmsStatusWebhook payload) {
        surveyService.handleSmsStatus(
                payload.getMessageSid(),
                payload.getMessageStatus(),
                payload.getErrorCode(),
                payload.toString()   // keep full raw payload logged
        );
        return "OK";
    }

    // -------- Internal event (optional) --------
    // Right now: no service method for participant-verified → comment it out OR add it later
    /*
    @PostMapping("/events/participant-verified")
    public String onParticipantVerified(@Valid @RequestBody ParticipantVerifiedEvent evt) {
        surveyService.autoAssignOnVerified(evt.getParticipantId());
        return "OK";
    }
    */
}
