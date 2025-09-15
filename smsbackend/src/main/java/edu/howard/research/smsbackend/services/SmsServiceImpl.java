package edu.howard.research.smsbackend.services;

import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmsServiceImpl implements SmsService {

    /**
     * Twilio Messaging Service SID (MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxx).
     * Provide via application.yml or env:
     *   twilio.messagingServiceSid: MG...
     */
    @Value("${twilio.messagingServiceSid}")
    private String messagingServiceSid;

    @Override
    public Map<String, Object> send(String toE164, String body) {
        try {
            Message msg = Message
                    .creator(new PhoneNumber(toE164), (String) null, body)
                    .setMessagingServiceSid(messagingServiceSid)
                    .create();

            String status = msg.getStatus() == null ? null : msg.getStatus().toString().toLowerCase();
            log.info("Twilio SMS queued: to={} sid={} status={}", toE164, msg.getSid(), status);

            return Map.of(
                    "ok", true,
                    "sid", msg.getSid(),
                    "status", status == null ? "queued" : status,
                    "to", toE164,
                    "body", body
            );

        } catch (ApiException e) {
            // Twilio error codes: https://www.twilio.com/docs/api/errors
            log.warn("Twilio SMS failed: to={} code={} msg={}", toE164, e.getCode(), e.getMessage());
            return Map.of(
                    "ok", false,
                    "to", toE164,
                    "body", body,
                    "error", (e.getCode() == null ? "api_exception" : String.valueOf(e.getCode()))
            );
        } catch (Exception e) {
            log.error("SMS send error: to={} err={}", toE164, e.getMessage(), e);
            return Map.of(
                    "ok", false,
                    "to", toE164,
                    "body", body,
                    "error", "unknown_error"
            );
        }
    }
}
