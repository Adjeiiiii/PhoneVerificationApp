package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.SurveyAccessRequest;
import edu.howard.research.smsbackend.models.dto.SurveyAccessResponse;
import edu.howard.research.smsbackend.models.dto.EnrollmentStatusDto;
import edu.howard.research.smsbackend.services.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/enrollment")
@RequiredArgsConstructor
@Slf4j
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    /**
     * Public endpoint to check enrollment status
     * Used by frontend to determine if enrollment form should be shown
     */
    @GetMapping("/status")
    public ResponseEntity<EnrollmentStatusDto> getEnrollmentStatus() {
        EnrollmentStatusDto status = enrollmentService.getEnrollmentStatus();
        return ResponseEntity.ok(status);
    }

    @PostMapping("/access-token")
    public ResponseEntity<SurveyAccessResponse> createSurveyAccessToken(@Valid @RequestBody SurveyAccessRequest request) {
        try {
            String token = enrollmentService.createSurveyAccessToken(request.getPassword());
            return ResponseEntity.ok(SurveyAccessResponse.success(token, 1800));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(SurveyAccessResponse.failure(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.internalServerError().body(SurveyAccessResponse.failure(e.getMessage()));
        }
    }
}




