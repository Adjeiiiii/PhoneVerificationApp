package edu.howard.research.smsbackend.util;

import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LinkPublicUidGeneratorTest {

    @RepeatedTest(200)
    void generateSixDigitNumeric_isSixDigitsDecimal() {
        String s = LinkPublicUidGenerator.generateSixDigitNumeric();
        assertThat(s).hasSize(6).matches("\\d{6}");
    }

    @Test
    void generateSixDigitNumeric_preservesLeadingZeros() {
        // Statistical: run many times; at least one should start with 0 (almost certain)
        boolean sawLeadingZero = false;
        for (int i = 0; i < 5000; i++) {
            if (LinkPublicUidGenerator.generateSixDigitNumeric().startsWith("0")) {
                sawLeadingZero = true;
                break;
            }
        }
        assertThat(sawLeadingZero).isTrue();
    }
}
