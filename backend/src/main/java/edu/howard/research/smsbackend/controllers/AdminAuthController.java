package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.AdminLoginRequest;
import edu.howard.research.smsbackend.models.dto.AdminLoginResponse;
import edu.howard.research.smsbackend.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminAuthController {

    private final JwtUtil jwtUtil;
    
    @Value("${admin.username}")
    private String adminUsername;
    
    @Value("${admin.password}")
    private String adminPassword;

    @PostMapping("/login")
    public ResponseEntity<AdminLoginResponse> login(@Valid @RequestBody AdminLoginRequest request) {
        log.info("Admin login attempt for username: {}", request.getUsername());
        
        // Validate credentials
        if (adminUsername.equals(request.getUsername()) && adminPassword.equals(request.getPassword())) {
            String token = jwtUtil.generateToken(request.getUsername());
            log.info("Admin login successful for username: {}", request.getUsername());
            return ResponseEntity.ok(AdminLoginResponse.success(token));
        } else {
            log.warn("Admin login failed for username: {}", request.getUsername());
            return ResponseEntity.badRequest()
                    .body(AdminLoginResponse.failure("Invalid username or password"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        log.info("Admin logout request");
        // For JWT, logout is handled client-side by removing the token
        // This endpoint just confirms the logout action
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Logged out successfully"
        ));
    }
}
