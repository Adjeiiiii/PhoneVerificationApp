package edu.howard.research.smsbackend.security;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class RequestLoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        if (request instanceof HttpServletRequest) {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            log.info("=== REQUEST LOGGING FILTER ===");
            log.info("Method: {}, URI: {}", httpRequest.getMethod(), httpRequest.getRequestURI());
            log.info("Authorization header: {}", httpRequest.getHeader("Authorization") != null ? "Present" : "Absent");
        }
        
        chain.doFilter(request, response);
    }
}

