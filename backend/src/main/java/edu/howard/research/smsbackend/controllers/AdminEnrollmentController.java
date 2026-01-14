package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.EnrollmentConfigDto;
import edu.howard.research.smsbackend.models.dto.UpdateEnrollmentConfigRequest;
import edu.howard.research.smsbackend.security.JwtAuthenticationFilter;
import edu.howard.research.smsbackend.services.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/enrollment")
@RequiredArgsConstructor
@Slf4j
public class AdminEnrollmentController {

    private final EnrollmentService enrollmentService;

    /**
     * Get enrollment configuration (admin only)
     */
    @GetMapping("/config")
    public ResponseEntity<EnrollmentConfigDto> getEnrollmentConfig() {
        EnrollmentConfigDto config = enrollmentService.getEnrollmentConfig();
        return ResponseEntity.ok(config);
    }

    /**
     * Update enrollment configuration (admin only)
     */
    @PutMapping("/config")
    public ResponseEntity<EnrollmentConfigDto> updateEnrollmentConfig(
            @Valid @RequestBody UpdateEnrollmentConfigRequest request
    ) {
        String adminUsername = JwtAuthenticationFilter.getCurrentUsername();
        EnrollmentConfigDto config = enrollmentService.updateEnrollmentConfig(request, adminUsername);
        return ResponseEntity.ok(config);
    }
}

