package edu.howard.research.smsbackend.services;

import java.util.Map;

/** Outbound SMS via Twilio Messaging Service (MG SID). */
public interface SmsService {

    /**
     * Send a single SMS.
     *
     * @param toE164 E.164 destination (e.g. +12025550123)
     * @param body   message text
     * @return map with keys:
     *   - ok (Boolean)
     *   - sid (String, Twilio Message SID)        [present when ok=true]
     *   - status (String, queued/sent/…)          [best-effort]
     *   - to (String)
     *   - body (String)
     *   - error (String, short code or message)   [present when ok=false]
     */
    Map<String, Object> send(String toE164, String body);
}
