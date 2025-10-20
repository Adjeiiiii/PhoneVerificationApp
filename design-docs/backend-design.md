# Backend Design Document

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Configuration](#configuration)
6. [Database Design](#database-design)
7. [Entity Models](#entity-models)
8. [Service Layer](#service-layer)
9. [REST API](#rest-api)
10. [Security](#security)
11. [External Integrations](#external-integrations)
12. [Database Migrations](#database-migrations)
13. [Deployment](#deployment)
14. [Development Workflow](#development-workflow)

## Overview

The backend is a Spring Boot application that serves as the core API for the Howard University Phone Verification and Survey System. It manages participant verification, survey link distribution, gift card rewards, and administrative operations.

### Core Functionality
- **Phone Verification**: OTP-based verification using Twilio
- **Survey Management**: Link pool management and distribution
- **Participant Management**: User lifecycle and status tracking
- **Gift Card System**: Reward distribution and tracking
- **Admin Operations**: Administrative dashboard and controls
- **Webhook Handling**: External service integration
- **Secure Authentication**: Environment-based credential management with no hardcoded defaults

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Spring Boot) │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  External APIs  │
                       │  • Twilio SMS   │
                       │  • SendGrid     │
                       └─────────────────┘
```

### Layered Architecture
```
┌─────────────────────────────────────────┐
│              Controllers                 │
├─────────────────────────────────────────┤
│              Services                    │
├─────────────────────────────────────────┤
│              Repositories               │
├─────────────────────────────────────────┤
│              Entities                   │
└─────────────────────────────────────────┘
```

## Technology Stack

### Core Framework
- **Spring Boot 3.5.5**: Main application framework
- **Java 21**: Programming language
- **Maven**: Build tool and dependency management

### Database & Persistence
- **PostgreSQL**: Primary database
- **Spring Data JPA**: ORM and data access
- **Hibernate**: JPA implementation
- **Flyway**: Database migration tool

### Security
- **Spring Security**: Authentication and authorization
- **JWT (jjwt)**: Token-based authentication
- **CORS**: Cross-origin resource sharing

### External Services
- **Twilio SDK**: SMS and phone verification
- **SendGrid**: Email delivery
- **Google libphonenumber**: Phone number validation

### Utilities
- **Lombok**: Code generation
- **OpenCSV**: CSV file processing
- **Spring Boot Actuator**: Monitoring and health checks

## Project Structure

```
backend/
├── src/main/java/edu/howard/research/smsbackend/
│   ├── config/                    # Configuration classes
│   │   ├── SecurityConfig.java
│   │   └── TwilioConfig.java
│   ├── controllers/               # REST API endpoints
│   │   ├── AdminAuthController.java
│   │   ├── AdminGiftCardController.java
│   │   ├── AdminSurveyController.java
│   │   ├── MessagesController.java
│   │   ├── OtpController.java
│   │   ├── ParticipantsController.java
│   │   └── WebhooksController.java
│   ├── exceptions/               # Exception handling
│   │   ├── GlobalExceptionHandler.java
│   │   └── NotFoundException.java
│   ├── models/                   # Data models
│   │   ├── dto/                  # Data Transfer Objects
│   │   └── entities/             # JPA entities
│   ├── repositories/              # Data access layer
│   ├── security/                 # Security components
│   │   └── JwtAuthenticationFilter.java
│   ├── services/                 # Business logic
│   │   ├── EmailService.java
│   │   ├── GiftCardService.java
│   │   ├── GiftCardServiceImpl.java
│   │   ├── InvitationsService.java
│   │   ├── OtpService.java
│   │   ├── OtpServiceImpl.java
│   │   ├── ParticipantsService.java
│   │   ├── ParticipantsServiceImpl.java
│   │   ├── SmsService.java
│   │   ├── SmsServiceImpl.java
│   │   ├── SurveyService.java
│   │   └── SurveyServiceImpl.java
│   ├── util/                     # Utility classes
│   │   ├── JwtUtil.java
│   │   └── PhoneNumberService.java
│   └── SmsbackendApplication.java # Main application class
├── src/main/resources/
│   ├── application.yml            # Application configuration
│   ├── application.properties    # Basic properties
│   └── db/migration/             # Database migrations
└── pom.xml                       # Maven configuration
```

## Configuration

### Application Configuration (`application.yml`)

```yaml
server:
  port: ${SERVER_PORT:8080}

spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:hu_research}
    username: ${DB_USER:hu_app}
    password: ${DB_PASSWORD:supersecret}
    hikari:
      maximum-pool-size: ${DB_POOL_MAX:10}
      connection-timeout: 30000

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        format_sql: true
        jdbc:
          time_zone: UTC
    open-in-view: false

  flyway:
    enabled: ${FLYWAY_ENABLED:true}
    locations: classpath:db/migration

twilio:
  accountSid: ${TWILIO_ACCOUNT_SID:}
  authToken: ${TWILIO_AUTH_TOKEN:}
  verifyServiceSid: ${VERIFY_SERVICE_SID:}
  messagingServiceSid: ${MESSAGING_SERVICE_SID:}

sendgrid:
  apiKey: ${SENDGRID_API_KEY:}
  fromEmail: ${SENDGRID_FROM_EMAIL:howardresearch@example.com}
  fromName: ${SENDGRID_FROM_NAME:Howard Research Team}

admin:
  username: ${ADMIN_USERNAME}
  password: ${ADMIN_PASSWORD}
  jwt:
    secret: ${JWT_SECRET}
    expiration: ${JWT_EXPIRATION:3600000}
```

### Environment Variables
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database connection
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`: Twilio credentials
- `VERIFY_SERVICE_SID`, `MESSAGING_SERVICE_SID`: Twilio service IDs
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`: Email service
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`: Admin credentials (REQUIRED - no defaults)
- `JWT_SECRET`, `JWT_EXPIRATION`: JWT configuration (JWT_SECRET REQUIRED - no default)

### Credential Management

#### Secure Credential Generation
The application includes a script to generate secure random credentials:

```bash
# Generate secure admin credentials
./generate-credentials.sh
```

This script generates:
- **Admin Username**: Random alphanumeric username
- **Admin Password**: 32-character random password
- **JWT Secret**: 128-character random hex string

#### Environment Setup Process
1. **Copy example file**: `cp .env.example .env`
2. **Generate credentials**: `./generate-credentials.sh`
3. **Update .env file** with generated values
4. **Never commit .env file** to version control

#### Security Benefits
- **No hardcoded credentials** in source code
- **No weak defaults** - application won't start without proper configuration
- **Environment-specific credentials** for different deployments
- **Easy credential rotation** by updating environment variables
- **Secure random generation** using OpenSSL

## Database Design

### Core Tables

#### 1. Participant Table
```sql
CREATE TABLE participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT,
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    consent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'subscribed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at TIMESTAMPTZ
);
```

#### 2. Survey Link Pool Table
```sql
CREATE TABLE survey_link_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_label TEXT,
    link_url TEXT NOT NULL UNIQUE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reserved_at TIMESTAMPTZ,
    reserved_until TIMESTAMPTZ,
    reserved_by TEXT
);
```

#### 3. Survey Invitation Table
```sql
CREATE TABLE survey_invitation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participant(id),
    link_id UUID NOT NULL REFERENCES survey_link_pool(id),
    link_url TEXT NOT NULL,
    message_sid TEXT,
    message_status TEXT,
    error_code TEXT,
    queued_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);
```

#### 4. Gift Card Tables
```sql
-- Gift Card Pool
CREATE TABLE gift_card_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_code VARCHAR(100) NOT NULL UNIQUE,
    card_type VARCHAR(32) NOT NULL,
    card_value DECIMAL(10,2) NOT NULL,
    redemption_url VARCHAR(500) NOT NULL,
    redemption_instructions VARCHAR(1000),
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    batch_label VARCHAR(100),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_to_gift_card_id UUID
);

-- Gift Cards
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participant(id),
    invitation_id UUID NOT NULL REFERENCES survey_invitation(id),
    card_code VARCHAR(100) NOT NULL,
    card_type VARCHAR(32) NOT NULL,
    card_value DECIMAL(10,2) NOT NULL,
    redemption_url VARCHAR(500) NOT NULL,
    redemption_instructions VARCHAR(1000),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    sent_by VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes VARCHAR(1000),
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    pool_id UUID REFERENCES gift_card_pool(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Distribution Logs
CREATE TABLE gift_card_distribution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
    action VARCHAR(32) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. SMS Event Log Table
```sql
CREATE TABLE sms_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID REFERENCES survey_invitation(id),
    message_sid TEXT,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indexes and Constraints
- Phone number uniqueness constraint
- Link URL uniqueness constraint
- Status indexes for performance
- Foreign key relationships with appropriate cascading

## Entity Models

### Core Entities

#### Participant Entity
```java
@Entity
@Table(name = "participant")
public class Participant {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;
    
    @Column(name = "phone", nullable = false)
    private String phone;
    
    @Column(name = "email")
    private String email;
    
    @Column(name = "name")
    private String name;
    
    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ParticipantStatus status = ParticipantStatus.SUBSCRIBED;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    
    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;
}
```

#### Survey Link Pool Entity
```java
@Entity
@Table(name = "survey_link_pool")
public class SurveyLinkPool {
    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;
    
    @Column(name = "batch_label")
    private String batchLabel;
    
    @Column(name = "link_url", nullable = false)
    private String linkUrl;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LinkStatus status = LinkStatus.AVAILABLE;
    
    @CreationTimestamp
    @Column(name = "uploaded_at", nullable = false, updatable = false)
    private OffsetDateTime uploadedAt;
}
```

#### Survey Invitation Entity
```java
@Entity
@Table(name = "survey_invitation")
public class SurveyInvitation {
    @Id
    @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "participant_id", nullable = false)
    private Participant participant;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "link_id", nullable = false)
    private SurveyLinkPool link;
    
    @Column(name = "link_url", nullable = false)
    private String linkUrl;
    
    @Column(name = "message_sid")
    private String messageSid;
    
    @Column(name = "message_status")
    private String messageStatus;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

### Enums

#### Participant Status
```java
public enum ParticipantStatus {
    SUBSCRIBED,
    OPTED_OUT
}
```

#### Link Status
```java
public enum LinkStatus {
    AVAILABLE,
    RESERVED,
    CLAIMED,
    EXHAUSTED,
    INVALID
}
```

#### Gift Card Status
```java
public enum GiftCardStatus {
    PENDING,
    SENT,
    DELIVERED,
    REDEEMED,
    UNSENT
}
```

#### Gift Card Type
```java
public enum GiftCardType {
    AMAZON,
    VISA,
    MASTERCARD,
    APPLE,
    GOOGLE
}
```

## Service Layer

### Core Services

#### OTP Service
**Purpose**: Handles phone number verification using Twilio Verify service

**Key Methods**:
- `start(OtpStartRequest req)`: Initiates OTP verification
- `check(OtpCheckRequest req)`: Validates OTP code

**Implementation Details**:
- Uses Twilio Verify service for OTP generation and validation
- Creates or updates participant records upon successful verification
- Handles email and name updates during verification
- Returns structured response with verification status

#### Survey Service
**Purpose**: Manages survey link assignment and distribution

**Key Methods**:
- `assignAndSendLink(String phone, String batchLabel)`: Assigns and sends survey link
- `handleSmsStatus(String messageSid, String status, String errorCode, String payload)`: Handles SMS delivery status
- `handleSurveyCompletion(SurveyCompletionWebhook payload)`: Processes survey completion

**Implementation Details**:
- Claims available links from the pool
- Creates survey invitations
- Sends SMS and email notifications
- Updates invitation status based on delivery events
- Automatically creates pending gift cards upon survey completion

#### Participants Service
**Purpose**: Manages participant data and operations

**Key Methods**:
- `list(int page, int limit, String search)`: Lists participants with pagination
- `getOne(String phone)`: Retrieves participant details
- `unsubscribe(String phone)`: Opts out participant
- `resubscribe(String phone)`: Re-subscribes participant

**Implementation Details**:
- Phone number normalization using libphonenumber
- Pagination and search functionality
- Status management (subscribed/opted_out)

#### Gift Card Service
**Purpose**: Comprehensive gift card management system

**Key Methods**:
- `createPendingGiftCard(UUID participantId, UUID invitationId)`: Creates pending gift card
- `sendGiftCard(UUID participantId, SendGiftCardRequest request, String adminUsername)`: Sends gift card
- `getEligibleParticipants()`: Gets participants eligible for gift cards
- `uploadGiftCards(MultipartFile file, String batchLabel, String adminUsername)`: Bulk upload
- `unsendGiftCard(UUID giftCardId, String adminUsername)`: Unsend gift card

**Implementation Details**:
- Pool management for available gift cards
- Distribution tracking with detailed logs
- Email and SMS delivery options
- CSV upload for bulk operations
- Comprehensive audit trail

#### SMS Service
**Purpose**: Handles SMS delivery via Twilio

**Key Methods**:
- `send(String toE164, String body)`: Sends SMS message

**Implementation Details**:
- Uses Twilio Messaging Service
- Returns structured response with delivery status
- Error handling for various Twilio error codes

#### Email Service
**Purpose**: Handles email delivery via SendGrid

**Key Methods**:
- `sendSurveyLink(String toEmail, String participantName, String surveyLink)`: Sends survey link
- `sendGiftCard(String toEmail, String participantName, String subject, String htmlContent)`: Sends gift card

**Implementation Details**:
- HTML email templates
- SendGrid API integration
- Error handling and logging

### Service Interfaces
All services implement interfaces for better testability and dependency injection:
- `OtpService` → `OtpServiceImpl`
- `SurveyService` → `SurveyServiceImpl`
- `ParticipantsService` → `ParticipantsServiceImpl`
- `GiftCardService` → `GiftCardServiceImpl`
- `SmsService` → `SmsServiceImpl`

## REST API

### API Structure
All APIs follow RESTful conventions with the base path `/api/`

### Public Endpoints (No Authentication Required)

#### OTP Endpoints
```
POST /api/otp/start
POST /api/otp/check
```

#### Participant Endpoints
```
GET  /api/participants/check-verification/{phone}
POST /api/participants/resend-survey-link
```

#### System Webhooks
```
POST /api/system/webhooks/survey/completed
POST /api/system/webhooks/provider/sms-status
```

### Admin Endpoints (JWT Authentication Required)

#### Authentication
```
POST /api/admin/login
POST /api/admin/logout
```

#### Survey Management
```
GET    /api/admin/stats
GET    /api/admin/stats/link-pool
GET    /api/admin/links
POST   /api/admin/links/upload
POST   /api/admin/upload-links
PATCH  /api/admin/links/{id}/invalid
PATCH  /api/admin/links/{id}/exhausted
PUT    /api/admin/update-link/{id}
DELETE /api/admin/delete-link/{id}
POST   /api/admin/links/cleanup-orphaned
```

#### Invitation Management
```
GET  /api/admin/invitations
POST /api/admin/invitations/send
POST /api/admin/invitations/{id}/complete
POST /api/admin/invitations/{id}/uncomplete
POST /api/admin/invitations/bulk-complete
POST /api/admin/invitations/bulk-uncomplete
```

#### User Management
```
PUT    /api/admin/update-user/{id}
GET    /api/admin/delete-user-info/{id}
DELETE /api/admin/delete-user/{id}
```

#### Gift Card Management
```
GET    /api/admin/gift-cards/eligible
GET    /api/admin/gift-cards
GET    /api/admin/gift-cards/sent
GET    /api/admin/gift-cards/{giftCardId}
POST   /api/admin/gift-cards/send/{participantId}
POST   /api/admin/gift-cards/{giftCardId}/resend
POST   /api/admin/gift-cards/{giftCardId}/notes
GET    /api/admin/gift-cards/{giftCardId}/logs
POST   /api/admin/gift-cards/pool/upload
POST   /api/admin/gift-cards/pool/add
GET    /api/admin/gift-cards/pool/status
GET    /api/admin/gift-cards/pool/available
GET    /api/admin/gift-cards/pool/batch/{batchLabel}
GET    /api/admin/gift-cards/pool/export/used
GET    /api/admin/gift-cards/unsent
DELETE /api/admin/gift-cards/pool/{poolId}
POST   /api/admin/gift-cards/{giftCardId}/unsend
```

### Request/Response Examples

#### OTP Start Request
```json
{
  "phone": "+1234567890",
  "channel": "sms"
}
```

#### OTP Start Response
```json
{
  "ok": true,
  "sid": "VE1234567890abcdef",
  "to": "+1234567890",
  "status": "pending",
  "channel": "sms"
}
```

#### Survey Link Assignment Request
```json
{
  "phone": "+1234567890",
  "batchLabel": "Fall-Study-A"
}
```

#### Survey Link Assignment Response
```json
{
  "ok": true,
  "invitationId": "123e4567-e89b-12d3-a456-426614174000",
  "participantId": "123e4567-e89b-12d3-a456-426614174001",
  "status": "queued",
  "messageSid": "SM1234567890abcdef",
  "linkUrl": "https://survey.example.com/abc123"
}
```

#### Gift Card Send Request
```json
{
  "invitationId": "123e4567-e89b-12d3-a456-426614174000",
  "cardCode": "AMZN123456789",
  "cardType": "AMAZON",
  "cardValue": 25.00,
  "redemptionUrl": "https://amazon.com/gc",
  "redemptionInstructions": "Enter code at checkout",
  "expiresAt": "2024-12-31T23:59:59Z",
  "notes": "Survey completion reward",
  "source": "POOL",
  "poolId": "123e4567-e89b-12d3-a456-426614174002",
  "deliveryMethod": "EMAIL"
}
```

### Error Handling
All endpoints return structured error responses:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

Common error codes:
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `SERVICE_ERROR`: External service error

## Security

### Authentication & Authorization

#### JWT Implementation
- **Token Generation**: Uses HMAC-SHA512 algorithm
- **Expiration**: Configurable (default 1 hour)
- **Secret**: Environment-configurable secret key
- **Claims**: Username and role information

#### Security Configuration
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        return http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/otp/**").permitAll()
                .requestMatchers("/api/participants/**").permitAll()
                .requestMatchers("/api/system/**").permitAll()
                .requestMatchers("/api/admin/login").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

#### JWT Filter
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                  HttpServletResponse response, 
                                  FilterChain filterChain) {
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            if (jwtUtil.validateToken(token) && !jwtUtil.isTokenExpired(token)) {
                String username = jwtUtil.getUsernameFromToken(token);
                
                UsernamePasswordAuthenticationToken auth = 
                    new UsernamePasswordAuthenticationToken(
                        username, null, 
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"))
                    );
                
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
```

#### CORS Configuration
- **Allowed Origins**: All origins (`*`)
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: All headers
- **Credentials**: Enabled

### Security Features
- **Stateless Authentication**: No server-side session storage
- **Role-Based Access Control**: ADMIN role for administrative endpoints
- **Input Validation**: Bean validation on all request DTOs
- **SQL Injection Prevention**: JPA/Hibernate parameterized queries
- **XSS Protection**: Input sanitization and output encoding

### Admin Credentials
- **Username**: Environment-configurable (REQUIRED - no default)
- **Password**: Environment-configurable (REQUIRED - no default)
- **JWT Secret**: Environment-configurable 128-character secret (REQUIRED - no default)
- **Token Expiration**: Environment-configurable (default: 1 hour)

#### Security Configuration Best Practices
- **No Default Credentials**: Application will not start without proper environment variables
- **Environment Variables**: All sensitive data stored in environment variables
- **Credential Generation**: Use `generate-credentials.sh` script for secure random credentials
- **Credential Rotation**: Easy to rotate credentials by updating environment variables

## External Integrations

### Twilio Integration

#### SMS Service
- **Service**: Twilio Messaging Service
- **Configuration**: Messaging Service SID
- **Features**: 
  - Bulk SMS delivery
  - Delivery status tracking
  - Error handling and retry logic
  - Message SID tracking for webhooks

#### Phone Verification
- **Service**: Twilio Verify Service
- **Configuration**: Verify Service SID
- **Features**:
  - OTP generation and validation
  - Multi-channel support (SMS, Voice)
  - Rate limiting and fraud protection
  - Verification status tracking

#### Implementation
```java
@Service
public class SmsServiceImpl implements SmsService {
    @Value("${twilio.messagingServiceSid}")
    private String messagingServiceSid;
    
    @Override
    public Map<String, Object> send(String toE164, String body) {
        try {
            Message msg = Message
                .creator(new PhoneNumber(toE164), (String) null, body)
                .setMessagingServiceSid(messagingServiceSid)
                .create();
                
            return Map.of(
                "ok", true,
                "sid", msg.getSid(),
                "status", msg.getStatus().toString().toLowerCase(),
                "to", toE164,
                "body", body
            );
        } catch (ApiException e) {
            return Map.of(
                "ok", false,
                "to", toE164,
                "body", body,
                "error", e.getCode()
            );
        }
    }
}
```

### SendGrid Integration

#### Email Service
- **Service**: SendGrid Email API
- **Configuration**: API Key, From Email, From Name
- **Features**:
  - HTML email templates
  - Delivery tracking
  - Error handling
  - Template management

#### Implementation
```java
@Service
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
            String subject = "HCAI (Howard University Research) Survey Link";
            String htmlContent = buildSurveyLinkEmail(participantName, surveyLink);
            Content content = new Content("text/html", htmlContent);
            
            Mail mail = new Mail(from, subject, new Email(toEmail), content);
            
            SendGrid sg = new SendGrid(apiKey);
            Request request = new Request();
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            
            Response response = sg.api(request);
            return response.getStatusCode() >= 200 && response.getStatusCode() < 300;
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", toEmail, e.getMessage());
            return false;
        }
    }
}
```

### Phone Number Validation

#### Google libphonenumber
- **Library**: Google libphonenumber
- **Features**:
  - International phone number validation
  - E.164 format normalization
  - Number type validation (mobile/fixed)
  - Country-specific validation

#### Implementation
```java
@Component
public class PhoneNumberService {
    private final PhoneNumberUtil phoneUtil = PhoneNumberUtil.getInstance();
    private final String defaultRegion;
    
    public String normalizeToE164(String raw) {
        try {
            Phonenumber.PhoneNumber parsed = phoneUtil.parse(raw.trim(), defaultRegion);
            
            if (!phoneUtil.isPossibleNumber(parsed) || !phoneUtil.isValidNumber(parsed)) {
                throw new IllegalArgumentException("Invalid phone number");
            }
            
            PhoneNumberUtil.PhoneNumberType type = phoneUtil.getNumberType(parsed);
            if (type != PhoneNumberUtil.PhoneNumberType.MOBILE && 
                type != PhoneNumberUtil.PhoneNumberType.FIXED_LINE_OR_MOBILE) {
                throw new IllegalArgumentException("Phone number type not SMS-capable");
            }
            
            return phoneUtil.format(parsed, PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch (NumberParseException e) {
            throw new IllegalArgumentException("Invalid phone format");
        }
    }
}
```

### Webhook Handling

#### Survey Completion Webhook
- **Endpoint**: `POST /api/system/webhooks/survey/completed`
- **Purpose**: Receives notifications when surveys are completed
- **Processing**:
  - Updates invitation status to completed
  - Marks survey link as exhausted
  - Creates pending gift card for participant
  - Logs completion event

#### SMS Status Webhook
- **Endpoint**: `POST /api/system/webhooks/provider/sms-status`
- **Purpose**: Receives SMS delivery status updates from Twilio
- **Processing**:
  - Updates invitation message status
  - Logs delivery events
  - Handles failed deliveries
  - Updates timestamps (sent, delivered, failed)

## Database Migrations

### Flyway Configuration
- **Location**: `classpath:db/migration`
- **Naming Convention**: `V{version}__{description}.sql`
- **Execution**: Automatic on application startup
- **Validation**: Schema validation against entities

### Migration History

#### V1: Initial Setup
- Enables PostgreSQL crypto extension
- Creates basic participant table

#### V2: Participant Table
```sql
CREATE TABLE participant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    phone_verified BOOLEAN NOT NULL DEFAULT false,
    consent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'subscribed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### V3: Enable pgcrypto
- Enables PostgreSQL crypto extension for UUID generation

#### V4: Survey Link Pool
```sql
CREATE TABLE survey_link_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_label TEXT,
    link_url TEXT NOT NULL UNIQUE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    uploaded_by TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reserved_at TIMESTAMPTZ,
    reserved_until TIMESTAMPTZ,
    reserved_by TEXT
);
```

#### V5: Survey Invitation
```sql
CREATE TABLE survey_invitation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participant(id),
    link_id UUID NOT NULL REFERENCES survey_link_pool(id),
    link_url TEXT NOT NULL,
    message_sid TEXT,
    message_status TEXT,
    error_code TEXT,
    queued_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### V6-V22: Additional Features
- Function for claiming available links
- View for link pool statistics
- SMS event logging
- Survey completion tracking
- Participant email and name fields
- Verification timestamp
- Gift card system tables

#### V23: Gift Card System
```sql
-- Gift Card Pool
CREATE TABLE gift_card_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_code VARCHAR(100) NOT NULL UNIQUE,
    card_type VARCHAR(32) NOT NULL,
    card_value DECIMAL(10,2) NOT NULL,
    redemption_url VARCHAR(500) NOT NULL,
    redemption_instructions VARCHAR(1000),
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    batch_label VARCHAR(100),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_to_gift_card_id UUID
);

-- Gift Cards
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES participant(id),
    invitation_id UUID NOT NULL REFERENCES survey_invitation(id),
    card_code VARCHAR(100) NOT NULL,
    card_type VARCHAR(32) NOT NULL,
    card_value DECIMAL(10,2) NOT NULL,
    redemption_url VARCHAR(500) NOT NULL,
    redemption_instructions VARCHAR(1000),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    sent_by VARCHAR(100),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes VARCHAR(1000),
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    pool_id UUID REFERENCES gift_card_pool(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Distribution Logs
CREATE TABLE gift_card_distribution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gift_card_id UUID NOT NULL REFERENCES gift_cards(id),
    action VARCHAR(32) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Migration Best Practices
- **Atomic Changes**: Each migration is atomic
- **Rollback Safety**: Migrations are designed to be safe
- **Index Management**: Proper indexing for performance
- **Constraint Management**: Appropriate foreign key constraints
- **Data Validation**: Check constraints for data integrity

## Deployment

### Docker Configuration

#### Dockerfile
```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Cache Maven deps first
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline

# Build application
COPY src src
RUN ./mvnw -q -DskipTests package

# Runtime stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy built jar
COPY --from=build /app/target/*-SNAPSHOT.jar app.jar

# Run as non-root user
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD curl -fsS http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

# Allow JVM flags and Spring profile
ENV JAVA_OPTS=""
ENV SPRING_PROFILES_ACTIVE=""
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS ${SPRING_PROFILES_ACTIVE:+-Dspring.profiles.active=$SPRING_PROFILES_ACTIVE} -jar app.jar"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=hu_research
      - DB_USER=hu_app
      - DB_PASSWORD=supersecret
      - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
      - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
      - VERIFY_SERVICE_SID=${VERIFY_SERVICE_SID}
      - MESSAGING_SERVICE_SID=${MESSAGING_SERVICE_SID}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=hu_research
      - POSTGRES_USER=hu_app
      - POSTGRES_PASSWORD=supersecret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Environment Configuration

#### Production Environment Variables
```bash
# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=hu_research
DB_USER=hu_app
DB_PASSWORD=your-secure-password

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
VERIFY_SERVICE_SID=your-verify-service-sid
MESSAGING_SERVICE_SID=your-messaging-service-sid

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=your-from-email
SENDGRID_FROM_NAME=your-from-name

# Admin Configuration (REQUIRED - NO DEFAULTS)
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-admin-password
JWT_SECRET=your-128-character-random-secret-key

# Application
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=production
```

### Health Checks

#### Spring Boot Actuator
- **Health Endpoint**: `/actuator/health`
- **Info Endpoint**: `/actuator/info`
- **Mappings Endpoint**: `/actuator/mappings`
- **Configuration**: Exposed endpoints are configurable

#### Health Check Implementation
```java
@Component
public class CustomHealthIndicator implements HealthIndicator {
    @Override
    public Health health() {
        // Custom health check logic
        return Health.up()
            .withDetail("database", "connected")
            .withDetail("twilio", "available")
            .withDetail("sendgrid", "available")
            .build();
    }
}
```

### Monitoring and Logging

#### Logging Configuration
```yaml
logging:
  level:
    root: INFO
    org.hibernate.SQL: DEBUG
    edu.howard.research.smsbackend: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
```

#### Application Monitoring
- **Metrics**: Spring Boot Actuator metrics
- **Logging**: Structured logging with SLF4J
- **Health Checks**: Custom health indicators
- **Performance**: JVM and application metrics

## Development Workflow

### Local Development Setup

#### Prerequisites
- Java 21
- Maven 3.6+
- PostgreSQL 15+
- Docker (optional)

#### Setup Steps
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Database Setup**
   ```bash
   # Using Docker
   docker run --name postgres-dev -e POSTGRES_DB=hu_research -e POSTGRES_USER=hu_app -e POSTGRES_PASSWORD=supersecret -p 5432:5432 -d postgres:15
   
   # Or install PostgreSQL locally
   createdb hu_research
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Generate secure credentials
   ./generate-credentials.sh
   # Copy generated values to .env file
   ```

4. **Build and Run**
   ```bash
   ./mvnw clean install
   ./mvnw spring-boot:run
   ```

#### Development Tools
- **IDE**: IntelliJ IDEA or Eclipse
- **Database Client**: pgAdmin or DBeaver
- **API Testing**: Postman or curl
- **Version Control**: Git

#### Security Requirements
⚠️ **IMPORTANT SECURITY NOTICE**:
- **Never commit `.env` files** to version control
- **Use secure, randomly generated credentials** for all environments
- **Application will not start** without proper environment variables
- **Rotate credentials regularly** in production environments
- **Use different credentials** for development, staging, and production

### Testing Strategy

#### Unit Tests
- **Service Layer**: Mock dependencies
- **Repository Layer**: Test data access
- **Utility Classes**: Test business logic
- **Coverage**: Aim for 80%+ code coverage

#### Integration Tests
- **API Endpoints**: Test full request/response cycle
- **Database Integration**: Test with real database
- **External Services**: Mock external API calls
- **Webhook Testing**: Test webhook handling

#### Test Configuration
```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "twilio.verifyServiceSid=test-sid",
    "twilio.messagingServiceSid=test-sid"
})
class IntegrationTest {
    @Test
    void testApiEndpoint() {
        // Test implementation
    }
}
```

### Code Quality

#### Code Standards
- **Java Style**: Google Java Style Guide
- **Naming Conventions**: camelCase for variables, PascalCase for classes
- **Documentation**: Javadoc for public APIs
- **Error Handling**: Comprehensive exception handling

#### Static Analysis
- **Checkstyle**: Code style enforcement
- **SpotBugs**: Bug detection
- **PMD**: Code quality analysis
- **SonarQube**: Code quality metrics

#### Code Review Process
1. **Pull Request**: Create PR for all changes
2. **Code Review**: At least one reviewer
3. **Testing**: All tests must pass
4. **Documentation**: Update documentation if needed
5. **Merge**: Merge after approval

### Deployment Pipeline

#### CI/CD Process
1. **Code Commit**: Push to repository
2. **Build**: Maven build and test
3. **Quality Gates**: Code quality checks
4. **Security Scan**: Vulnerability scanning
5. **Deploy**: Deploy to staging/production
6. **Monitor**: Monitor deployment health

#### Build Configuration
```xml
<plugin>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-maven-plugin</artifactId>
    <configuration>
        <excludes>
            <exclude>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
            </exclude>
        </excludes>
    </configuration>
</plugin>
```

### Performance Optimization

#### Database Optimization
- **Indexing**: Proper indexes on frequently queried columns
- **Query Optimization**: Efficient JPA queries
- **Connection Pooling**: HikariCP configuration
- **Caching**: Spring Cache for frequently accessed data

#### Application Optimization
- **JVM Tuning**: Optimize heap size and GC settings
- **Async Processing**: Use @Async for long-running tasks
- **Connection Pooling**: Optimize database connections
- **Memory Management**: Monitor memory usage

#### Monitoring
- **Application Metrics**: Spring Boot Actuator
- **Database Metrics**: Connection pool and query performance
- **External Service Metrics**: API response times
- **Error Tracking**: Comprehensive error logging

---

This comprehensive backend design document covers all aspects of the Spring Boot application, from architecture and technology stack to deployment and development workflow. The system is designed to be scalable, maintainable, and secure, with proper separation of concerns and comprehensive error handling.
