package edu.howard.research.smsbackend.models.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class OtpCheckRequest {

    @NotBlank(message = "Phone number is required")
    @Pattern(
            regexp = "^\\+?[1-9]\\d{6,14}$",
            message = "Phone must be in E.164 format, e.g. +12025550123"
    )
    private String phone;

    @NotBlank(message = "Code is required")
    @Pattern(
            regexp = "^[0-9]{4,8}$",
            message = "Code must be 4–8 digits"
    )
    private String code;

    private String email;
    private String name;

    // Getters
    public String getPhone() {
        return phone;
    }
    public String getCode() {
        return code;
    }
    public String getEmail() {
        return email;
    }
    public String getName() {
        return name;
    }

    // Setters
    public void setPhone(String phone) {
        this.phone = phone;
    }
    public void setCode(String code) {
        this.code = code;
    }
    public void setEmail(String email) {
        this.email = email;
    }
    public void setName(String name) {
        this.name = name;
    }
}
