package edu.howard.research.smsbackend.util;

import java.security.SecureRandom;

/**
 * Generates {@code link_public_uid} values: six decimal digits ({@code 000000}–{@code 999999}).
 */
public final class LinkPublicUidGenerator {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int UPPER_EXCLUSIVE = 1_000_000;

    private LinkPublicUidGenerator() {}

    /**
     * Uniform random six-digit string, zero-padded (e.g. {@code "004812"}).
     */
    public static String generateSixDigitNumeric() {
        int n = RANDOM.nextInt(UPPER_EXCLUSIVE);
        return String.format("%06d", n);
    }
}
