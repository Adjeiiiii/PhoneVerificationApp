package edu.howard.research.smsbackend.util;

import java.util.ArrayList;
import java.util.List;

/**
 * Append {@code uid} query param to survey links and normalize URLs for invitation lookup
 * when the survey platform reports completion with extra query parameters.
 */
public final class LinkUrlUtils {

    private LinkUrlUtils() {}

    /**
     * Appends {@code uid=<publicUid>} using {@code ?} or {@code &} as appropriate.
     * Skips if {@code publicUid} is blank or the URL already contains a {@code uid=} parameter.
     */
    public static String appendParticipantUid(String url, String publicUid) {
        if (url == null || url.isBlank() || publicUid == null || publicUid.isBlank()) {
            return url;
        }
        if (containsUidParameter(url)) {
            return url;
        }
        String sep = url.contains("?") ? "&" : "?";
        return url + sep + "uid=" + publicUid;
    }

    private static boolean containsUidParameter(String url) {
        int q = url.indexOf('?');
        if (q < 0) {
            return false;
        }
        String query = url.substring(q + 1);
        for (String part : query.split("&")) {
            if (part.startsWith("uid=") || part.startsWith("uid%3D")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Short links sent by SMS/email must be the proxy URL only (no {@code uid}); the participant id is on the
     * stored long URL and applied when {@code /s/{code}} redirects. Strips {@code uid} if present on the short URL.
     */
    public static String shortLinkForOutbound(String shortUrl) {
        if (shortUrl == null || shortUrl.isBlank()) {
            return shortUrl;
        }
        return withoutUidParameter(shortUrl.trim());
    }

    /**
     * Removes the {@code uid} query parameter (name only; value may be empty).
     * Used so completion webhooks that include {@code &uid=} still match invitations stored without it.
     */
    public static String withoutUidParameter(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        int q = url.indexOf('?');
        if (q < 0) {
            return url;
        }
        String base = url.substring(0, q);
        String query = url.substring(q + 1);
        String[] parts = query.split("&");
        List<String> kept = new ArrayList<>();
        for (String p : parts) {
            if (p.isEmpty()) {
                continue;
            }
            String name = p;
            int eq = p.indexOf('=');
            if (eq >= 0) {
                name = p.substring(0, eq);
            }
            if ("uid".equals(name)) {
                continue;
            }
            kept.add(p);
        }
        if (kept.isEmpty()) {
            return base;
        }
        return base + "?" + String.join("&", kept);
    }
}
