package edu.howard.research.smsbackend.services;

import edu.howard.research.smsbackend.models.dto.EnrollmentConfigDto;
import edu.howard.research.smsbackend.models.dto.EnrollmentStatusDto;
import edu.howard.research.smsbackend.models.dto.UpdateEnrollmentConfigRequest;
import edu.howard.research.smsbackend.models.entities.SurveyEnrollmentConfig;
import edu.howard.research.smsbackend.repositories.ParticipantRepository;
import edu.howard.research.smsbackend.repositories.SurveyEnrollmentConfigRepository;
import edu.howard.research.smsbackend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EnrollmentServiceImpl implements EnrollmentService {

    private final SurveyEnrollmentConfigRepository configRepository;
    private final ParticipantRepository participantRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.survey-access.default-password:}")
    private String defaultSurveyAccessPassword;

    @Value("${app.survey-access.default-password-hash:}")
    private String defaultSurveyAccessPasswordHash;

    @Value("${app.survey-access.token-expiration-ms:1800000}")
    private long surveyAccessTokenExpirationMs;

    private static final String SURVEY_ACCESS_SCOPE = "survey_access";

    @Override
    public EnrollmentStatusDto getEnrollmentStatus() {
        // Count participants who have received a survey link (enrolled), not just verified phones
        long currentCount = participantRepository.countEnrolledParticipants();
        SurveyEnrollmentConfig config = getOrCreateConfig();
        
        Integer maxParticipants = config.getMaxParticipants();
        boolean isEnrollmentActive = config.getIsEnrollmentActive();
        
        boolean isFull = false;
        int remainingSpots = -1; // -1 means unlimited
        String status = "UNLIMITED";
        
        if (!isEnrollmentActive) {
            status = "DISABLED";
            isFull = true;
        } else if (maxParticipants != null) {
            remainingSpots = Math.max(0, maxParticipants - (int) currentCount);
            isFull = currentCount >= maxParticipants;
            status = isFull ? "FULL" : "OPEN";
        } else {
            status = "UNLIMITED";
        }
        
        return new EnrollmentStatusDto(
            isFull,
            (int) currentCount,
            maxParticipants,
            isEnrollmentActive,
            Boolean.TRUE.equals(config.getSurveyAccessEnabled()),
            remainingSpots,
            status
        );
    }

    @Override
    public EnrollmentConfigDto getEnrollmentConfig() {
        // Count participants who have received a survey link (enrolled), not just verified phones
        long currentCount = participantRepository.countEnrolledParticipants();
        SurveyEnrollmentConfig config = getOrCreateConfig();
        
        Integer maxParticipants = config.getMaxParticipants();
        boolean isEnrollmentActive = config.getIsEnrollmentActive();
        
        int remainingSpots = -1;
        String status = "UNLIMITED";
        
        if (!isEnrollmentActive) {
            status = "DISABLED";
        } else if (maxParticipants != null) {
            remainingSpots = Math.max(0, maxParticipants - (int) currentCount);
            status = (currentCount >= maxParticipants) ? "FULL" : "OPEN";
        } else {
            status = "UNLIMITED";
        }
        
        return new EnrollmentConfigDto(
            config.getId(),
            maxParticipants,
            isEnrollmentActive,
            Boolean.TRUE.equals(config.getSurveyAccessEnabled()),
            config.getSurveyAccessPasswordHash() != null && !config.getSurveyAccessPasswordHash().isBlank(),
            config.getUpdatedBy(),
            config.getCreatedAt(),
            config.getUpdatedAt(),
            (int) currentCount,
            remainingSpots,
            status
        );
    }

    @Override
    @Transactional
    public EnrollmentConfigDto updateEnrollmentConfig(UpdateEnrollmentConfigRequest request, String adminUsername) {
        SurveyEnrollmentConfig config = getOrCreateConfig();
        
        // Count participants who have received a survey link (enrolled), not just verified phones
        long currentCount = participantRepository.countEnrolledParticipants();
        
        // Validate: can't set limit below current enrollment
        if (request.getMaxParticipants() != null && request.getMaxParticipants() < currentCount) {
            throw new IllegalArgumentException(
                String.format("Cannot set maximum participants to %d. Current enrollment is %d. Please set a limit of at least %d or delete some participants first.",
                    request.getMaxParticipants(), currentCount, currentCount)
            );
        }
        
        if (request.getMaxParticipants() != null) {
            config.setMaxParticipants(request.getMaxParticipants());
        }
        
        if (request.getIsEnrollmentActive() != null) {
            config.setIsEnrollmentActive(request.getIsEnrollmentActive());
        }

        if (request.getSurveyAccessEnabled() != null) {
            config.setSurveyAccessEnabled(request.getSurveyAccessEnabled());
        }

        if (request.getSurveyAccessPassword() != null && !request.getSurveyAccessPassword().isBlank()) {
            String raw = request.getSurveyAccessPassword().trim();
            if (raw.length() < 6) {
                throw new IllegalArgumentException("Survey access password must be at least 6 characters.");
            }
            config.setSurveyAccessPasswordHash(BCrypt.hashpw(raw, BCrypt.gensalt()));
        }
        
        config.setUpdatedBy(adminUsername);
        config = configRepository.save(config);
        
        log.info("Enrollment config updated by {}: maxParticipants={}, isEnrollmentActive={}", 
            adminUsername, config.getMaxParticipants(), config.getIsEnrollmentActive());
        
        return getEnrollmentConfig();
    }

    @Override
    public boolean isEnrollmentFull() {
        EnrollmentStatusDto status = getEnrollmentStatus();
        return status.isFull();
    }

    @Override
    public boolean isValidSurveyAccessToken(String token) {
        SurveyEnrollmentConfig config = getOrCreateConfig();
        if (!Boolean.TRUE.equals(config.getSurveyAccessEnabled())) {
            return true;
        }
        return token != null && !token.isBlank() && jwtUtil.validateScopedToken(token, SURVEY_ACCESS_SCOPE);
    }

    @Override
    public String createSurveyAccessToken(String password) {
        SurveyEnrollmentConfig config = getOrCreateConfig();
        if (!Boolean.TRUE.equals(config.getSurveyAccessEnabled())) {
            return jwtUtil.generateScopedToken("public", SURVEY_ACCESS_SCOPE, surveyAccessTokenExpirationMs);
        }

        String effectiveHash = resolveSurveyAccessPasswordHash(config);
        if (effectiveHash == null || effectiveHash.isBlank()) {
            throw new IllegalStateException("Survey access password is not configured.");
        }
        if (password == null || password.isBlank() || !BCrypt.checkpw(password, effectiveHash)) {
            throw new IllegalArgumentException("Invalid survey access password.");
        }
        return jwtUtil.generateScopedToken("public", SURVEY_ACCESS_SCOPE, surveyAccessTokenExpirationMs);
    }

    private String resolveSurveyAccessPasswordHash(SurveyEnrollmentConfig config) {
        if (config.getSurveyAccessPasswordHash() != null && !config.getSurveyAccessPasswordHash().isBlank()) {
            return config.getSurveyAccessPasswordHash();
        }
        if (defaultSurveyAccessPasswordHash != null && !defaultSurveyAccessPasswordHash.isBlank()) {
            return defaultSurveyAccessPasswordHash;
        }
        if (defaultSurveyAccessPassword != null && !defaultSurveyAccessPassword.isBlank()) {
            return BCrypt.hashpw(defaultSurveyAccessPassword, BCrypt.gensalt());
        }
        return null;
    }

    private SurveyEnrollmentConfig getOrCreateConfig() {
        return configRepository.findFirstByOrderByCreatedAtAsc()
            .orElseGet(() -> {
                log.info("No enrollment config found, creating default (unlimited, active)");
                SurveyEnrollmentConfig defaultConfig = new SurveyEnrollmentConfig();
                defaultConfig.setMaxParticipants(null); // unlimited
                defaultConfig.setIsEnrollmentActive(true);
                defaultConfig.setSurveyAccessEnabled(true);
                defaultConfig.setSurveyAccessPasswordHash(resolveSurveyAccessPasswordHash(defaultConfig));
                defaultConfig.setUpdatedBy("SYSTEM");
                return configRepository.save(defaultConfig);
            });
    }
}

