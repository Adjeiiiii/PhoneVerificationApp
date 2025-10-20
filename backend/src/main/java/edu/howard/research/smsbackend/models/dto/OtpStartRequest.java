package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class OtpStartRequest {

    @NotBlank(message = "Phone number is required")
    // E.164 regex: starts with +, then digits, 7–15 total
    @Pattern(
            regexp = "^\\+?[1-9]\\d{6,14}$",
            message = "Phone must be in E.164 format, e.g. +12025550123"
    )
    private String phone;

    @NotBlank(message = "Channel is required (sms, call, whatsapp)")
    @Pattern(
            regexp = "^(sms|call|whatsapp)$",
            message = "Channel must be one of: sms, call, whatsapp"
    )
    private String channel;

    // Getters
    public String getPhone() {
        return phone;
    }
    public String getChannel() {
        return channel;
    }

    // Setters
    public void setPhone(String phone) {
        this.phone = phone;
    }
    public void setChannel(String channel) {
        this.channel = channel;
    }
}
