package edu.howard.research.smsbackend.models.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SmsStatusWebhook {

    @JsonProperty("MessageSid")
    private String messageSid;

    @JsonProperty("SmsSid")
    private String smsSid;

    @JsonProperty("AccountSid")
    private String accountSid;

    @JsonProperty("MessagingServiceSid")
    private String messagingServiceSid;

    @JsonProperty("From")
    private String from;

    @JsonProperty("To")
    private String to;

    @JsonProperty("MessageStatus")
    private String messageStatus;

    @JsonProperty("ErrorCode")
    private String errorCode;

    @JsonProperty("ErrorMessage")
    private String errorMessage;

    // getters & setters
    public String getMessageSid() { return messageSid; }
    public void setMessageSid(String messageSid) { this.messageSid = messageSid; }

    public String getSmsSid() { return smsSid; }
    public void setSmsSid(String smsSid) { this.smsSid = smsSid; }

    public String getAccountSid() { return accountSid; }
    public void setAccountSid(String accountSid) { this.accountSid = accountSid; }

    public String getMessagingServiceSid() { return messagingServiceSid; }
    public void setMessagingServiceSid(String messagingServiceSid) { this.messagingServiceSid = messagingServiceSid; }

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }

    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }

    public String getMessageStatus() { return messageStatus; }
    public void setMessageStatus(String messageStatus) { this.messageStatus = messageStatus; }

    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    @Override
    public String toString() {
        return "SmsStatusWebhook{" +
                "messageSid='" + messageSid + '\'' +
                ", to='" + to + '\'' +
                ", status='" + messageStatus + '\'' +
                ", errorCode='" + errorCode + '\'' +
                '}';
    }
}
