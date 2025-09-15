package edu.howard.research.smsbackend.models.dto;

public class SurveyCompletionWebhook {
    private String token;
    private String url;

    // getters & setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
}
