package edu.howard.research.smsbackend.controllers;

import edu.howard.research.smsbackend.models.dto.SendSmsRequest;
import edu.howard.research.smsbackend.services.SmsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessagesController {

    private final SmsService smsService;

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(@Valid @RequestBody SendSmsRequest req) {
        return ResponseEntity.ok(smsService.send(req.getPhone(), req.getBody()));
    }
}
