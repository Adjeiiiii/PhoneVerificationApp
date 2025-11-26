package edu.howard.research.smsbackend.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;

@Component
@Slf4j
public class JwtUtil {

    private final SecretKey secretKey;
    private final long expirationTime;

    public JwtUtil(@Value("${admin.jwt.secret}") String secret,
                   @Value("${admin.jwt.expiration}") long expirationTime) {
        // HS512 requires at least 512 bits (64 bytes) key length
        // If secret is shorter, we'll hash it to ensure proper length
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 64) {
            try {
                // Use SHA-512 to hash the secret to get exactly 64 bytes
                MessageDigest digest = MessageDigest.getInstance("SHA-512");
                secretBytes = digest.digest(secretBytes);
            } catch (Exception e) {
                log.error("Error hashing JWT secret", e);
                // Fallback: pad with repetition if hashing fails
                byte[] padded = new byte[64];
                System.arraycopy(secretBytes, 0, padded, 0, Math.min(secretBytes.length, 64));
                for (int i = secretBytes.length; i < 64; i++) {
                    padded[i] = secretBytes[i % secretBytes.length];
                }
                secretBytes = padded;
            }
        }
        this.secretKey = Keys.hmacShaKeyFor(secretBytes);
        this.expirationTime = expirationTime;
    }

    public String generateToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationTime);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(secretKey, SignatureAlgorithm.HS512)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("Error checking token expiration: {}", e.getMessage());
            return true;
        }
    }
}
