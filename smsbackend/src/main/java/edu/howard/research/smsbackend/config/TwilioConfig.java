package edu.howard.research.smsbackend.config;

import com.twilio.Twilio;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TwilioConfig {
    public TwilioConfig(
            @Value("${twilio.accountSid:}") String accountSid,
            @Value("${twilio.authToken:}") String authToken
    ) {
        if (accountSid != null && !accountSid.isBlank() && authToken != null && !authToken.isBlank()) {
            Twilio.init(accountSid, authToken);
            System.out.println("[Twilio] SDK version = " + com.twilio.Twilio.VERSION);
        } else {
            System.out.println("[Twilio] Skipping init (missing credentials)");
        }
    }
}
