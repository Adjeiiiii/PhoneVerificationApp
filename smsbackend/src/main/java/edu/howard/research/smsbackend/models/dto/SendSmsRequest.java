package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class SendSmsRequest {
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^\\+?[1-9]\\d{6,14}$", message = "Use E.164, e.g. +12025550123")
    private String phone;

    @NotBlank(message = "Body is required")
    private String body;

    public String getPhone() { return phone; }
    public String getBody() { return body; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setBody(String body) { this.body = body; }
}
