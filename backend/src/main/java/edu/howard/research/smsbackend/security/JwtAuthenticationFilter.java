package edu.howard.research.smsbackend.security;

import edu.howard.research.smsbackend.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            try {
                if (jwtUtil.validateToken(token) && !jwtUtil.isTokenExpired(token)) {
                    String username = jwtUtil.getUsernameFromToken(token);
                    
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            username, null, Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    );
                    
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    log.debug("JWT authentication successful for user: {}", username);
                } else {
                    log.warn("Invalid or expired JWT token for request: {}", request.getRequestURI());
                }
            } catch (Exception e) {
                log.warn("JWT authentication failed for request {}: {}", request.getRequestURI(), e.getMessage());
            }
        } else {
            log.debug("No valid Authorization header for request: {}", request.getRequestURI());
        }
        
        filterChain.doFilter(request, response);
    }

    /**
     * Get the current authenticated username from SecurityContext
     */
    public static String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        log.debug("Current authentication: {}, isAuthenticated: {}, name: {}", 
                authentication, 
                authentication != null ? authentication.isAuthenticated() : "null",
                authentication != null ? authentication.getName() : "null");
        
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
            return authentication.getName();
        }
        return "SYSTEM";
    }
}
