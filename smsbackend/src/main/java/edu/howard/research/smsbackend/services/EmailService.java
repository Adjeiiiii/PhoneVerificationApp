package edu.howard.research.smsbackend.services;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    @Value("${sendgrid.apiKey}")
    private String apiKey;

    @Value("${sendgrid.fromEmail}")
    private String fromEmail;

    @Value("${sendgrid.fromName}")
    private String fromName;

    public boolean sendSurveyLink(String toEmail, String participantName, String surveyLink) {
        try {
            Email from = new Email(fromEmail, fromName);
            String subject = "Your Survey Link - Howard Research Study";
            
            String htmlContent = buildSurveyLinkEmail(participantName, surveyLink);
            Content content = new Content("text/html", htmlContent);
            
            Mail mail = new Mail(from, subject, new Email(toEmail), content);
            
            SendGrid sg = new SendGrid(apiKey);
            Request request = new Request();
            
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            
            Response response = sg.api(request);
            
            log.info("Email sent to {}: Status={}, ResponseCode={}", 
                    toEmail, response.getStatusCode(), response.getBody());
            
            return response.getStatusCode() >= 200 && response.getStatusCode() < 300;
            
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    public boolean sendVerificationCode(String toEmail, String participantName, String verificationCode) {
        try {
            Email from = new Email(fromEmail, fromName);
            String subject = "Your Verification Code - Howard Research Study";
            
            String htmlContent = buildVerificationEmail(participantName, verificationCode);
            Content content = new Content("text/html", htmlContent);
            
            Mail mail = new Mail(from, subject, new Email(toEmail), content);
            
            SendGrid sg = new SendGrid(apiKey);
            Request request = new Request();
            
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            
            Response response = sg.api(request);
            
            log.info("Verification email sent to {}: Status={}, ResponseCode={}", 
                    toEmail, response.getStatusCode(), response.getBody());
            
            return response.getStatusCode() >= 200 && response.getStatusCode() < 300;
            
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    public boolean sendGiftCard(String toEmail, String participantName, String subject, String htmlContent) {
        try {
            Email from = new Email(fromEmail, fromName);
            Content content = new Content("text/html", htmlContent);
            
            Mail mail = new Mail(from, subject, new Email(toEmail), content);
            
            SendGrid sg = new SendGrid(apiKey);
            Request request = new Request();
            
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            
            Response response = sg.api(request);
            
            log.info("Gift card email sent to {}: Status={}, ResponseCode={}", 
                    toEmail, response.getStatusCode(), response.getBody());
            
            return response.getStatusCode() >= 200 && response.getStatusCode() < 300;
            
        } catch (Exception e) {
            log.error("Failed to send gift card email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }

    private String buildSurveyLinkEmail(String participantName, String surveyLink) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Survey Link - Howard Research Study</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h1 style="color: #2c3e50; margin-top: 0;">Howard University AI for Health Study</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
                    <h2 style="color: #2c3e50;">Hello %s!</h2>
                    
                    <p>Thank you for participating in our research study. Here's your survey link:</p>
                    
                    <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <a href="%s" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                            Take Survey Now
                        </a>
                    </div>
                    
                    <p><strong>Important Information:</strong></p>
                    <ul>
                        <li>You can pause and restart the survey at any time</li>
                        <li>The survey must be completed within 10 days</li>
                        <li>Once completed, we'll send your Amazon gift card</li>
                    </ul>
                    
                    <p>If you have any questions, please contact us at <a href="tel:2404288442">(240) 428-8442</a> or reply to this email.</p>
                    
                    <p>Thank you for your participation!</p>
                    
                    <p style="margin-top: 30px;">
                        <strong>The Howard Research Team</strong><br>
                        Howard University<br>
                        AI for Health Study
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
                    <p>This email was sent because you requested a survey link for our research study.</p>
                </div>
            </body>
            </html>
            """, participantName != null ? participantName : "Participant", surveyLink);
    }

    private String buildVerificationEmail(String participantName, String verificationCode) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Code - Howard Research Study</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h1 style="color: #2c3e50; margin-top: 0;">Howard University AI for Health Study</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
                    <h2 style="color: #2c3e50;">Hello %s!</h2>
                    
                    <p>Your verification code is:</p>
                    
                    <div style="background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">%s</span>
                    </div>
                    
                    <p>Please enter this code to verify your email address and continue with the study.</p>
                    
                    <p><strong>Note:</strong> This code will expire in 10 minutes for security reasons.</p>
                    
                    <p>If you didn't request this verification code, please ignore this email.</p>
                    
                    <p style="margin-top: 30px;">
                        <strong>The Howard Research Team</strong><br>
                        Howard University<br>
                        AI for Health Study
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
                    <p>This verification code was requested for our research study.</p>
                </div>
            </body>
            </html>
            """, participantName != null ? participantName : "Participant", verificationCode);
    }
}
