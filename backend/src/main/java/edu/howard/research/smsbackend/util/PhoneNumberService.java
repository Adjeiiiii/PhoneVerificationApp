package edu.howard.research.smsbackend.util;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.Phonenumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PhoneNumberService {

    private final PhoneNumberUtil phoneUtil = PhoneNumberUtil.getInstance();
    private final String defaultRegion;

    public PhoneNumberService(@Value("${app.phone.defaultRegion:US}") String defaultRegion) {
        this.defaultRegion = defaultRegion;
    }

    /**
     * Parse and validate a phone string and return strict E.164 (+XXXXXXXXXXX).
     * Throws IllegalArgumentException on invalid numbers.
     */
    public String normalizeToE164(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("phone is required");
        }
        final String trimmed = raw.trim();

        try {
            // If the input already starts with '+', region is ignored; otherwise we use defaultRegion.
            Phonenumber.PhoneNumber parsed = phoneUtil.parse(trimmed, defaultRegion);

            // Hard validation: must be possible + valid per lib rules
            if (!phoneUtil.isPossibleNumber(parsed)) {
                throw new IllegalArgumentException("phone number not possible");
            }
            if (!phoneUtil.isValidNumber(parsed)) {
                throw new IllegalArgumentException("phone number not valid");
            }

            // Optional: restrict to mobile-capable types only. Comment out if you want to allow fixed-lines.
            PhoneNumberUtil.PhoneNumberType type = phoneUtil.getNumberType(parsed);
            switch (type) {
                case MOBILE, FIXED_LINE_OR_MOBILE -> {
                    // OK: SMS-capable
                }
                default -> {
                    throw new IllegalArgumentException(
                            "Phone number type " + type + " is not SMS-capable"
                    );
                }
            }

            return phoneUtil.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException e) {
            throw new IllegalArgumentException("invalid phone format");
        }
    }
}
