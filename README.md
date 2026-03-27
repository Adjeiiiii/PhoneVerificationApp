# Phone Verification App

A full-stack application for phone number verification and survey link distribution, built for Howard University's AI for Health research study.

## 📚 Documentation

- **[Frontend Design Document](design-docs/frontend-design.md)** - Complete React architecture, components, and workflows
- **[Backend Design Document](design-docs/backend-design.md)** - Comprehensive Spring Boot API, services, and security
- **[Environment Setup Guide](backend/ENVIRONMENT_SETUP.md)** - Detailed configuration instructions

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Spring Boot + Java 21
- **Database**: PostgreSQL
- **SMS Service**: Twilio
- **Email Service**: SendGrid
- **Containerization**: Docker + Docker Compose

### Notable capabilities

- **Participant flow**: Optional **survey access password** (set in Enrollment Settings; short-lived scoped JWT via `X-Survey-Access-Token` on public API calls).
- **Signup IP cooldown**: After a completed signup, the same client IP is blocked from starting again for **7 days** (checked at eligibility; uses `signup_ip` on `participant`).
- **Admin**: **Enrollment Settings** is gated by a separate password (scoped token in `X-Enrollment-Access-Token`). Dashboard **All Invitations** supports optional **enrollment date range** filters (`createdAt`, database-side). **Bulk Complete** accepts a file of survey links to mark completions.
- **Gift cards**: Admin “sent” history includes cards in **SENT**, **DELIVERED**, **REDEEMED**, and **EXPIRED** (not only `SENT`).

## 🚀 Quick Start

### Prerequisites

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Java 21](https://openjdk.org/projects/jdk/21/) (for local development)

### 1. Clone the Repository

```bash
git clone https://github.com/Adjeiiiii/PhoneVerificationApp.git
cd PhoneVerificationApp
```

### 2. Environment Setup

#### Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create environment file from template:
   ```bash
   cp .env.example .env
   ```

3. Generate secure credentials:
   ```bash
   ./generate-credentials.sh
   ```

4. Update `.env` file with generated credentials and your service API keys:
   ```bash
   # Copy the generated values from generate-credentials.sh
   # Add your Twilio, SendGrid, and database credentials
   ```

#### Frontend Configuration

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### 3. Run the Application

#### Option A: Docker Compose (Recommended)

From the project root directory:

```bash
# Start backend services (database + API)
cd backend
docker-compose up --build

# In a new terminal, start frontend
cd ../frontend
npm run dev
```

#### Option B: Local Development

1. **Start Backend:**
   ```bash
   cd backend
   docker-compose up db  # Start only database
   ./mvnw spring-boot:run  # Start Spring Boot app
   ```

2. **Start Frontend:**
   ```bash
   cd ../frontend
   npm run dev
   ```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Admin login**: http://localhost:5173/admin-login  
- **Admin routes** (after login): `/admin-dashboard`, `/admin-ops`, `/admin-gift-cards`, `/admin-enrollment`

## 📁 Project Structure

```
PhoneVerificationApp/
├── frontend/                        # React frontend
│   ├── src/
│   │   ├── pages/                   # React components
│   │   ├── contexts/                # React context providers
│   │   ├── utils/                   # API utilities
│   │   └── routes/                  # Route components
│   ├── package.json
│   └── vite.config.ts
├── backend/                         # Spring Boot backend
│   ├── src/main/java/edu/howard/research/smsbackend/
│   │   ├── controllers/             # REST controllers
│   │   ├── services/                # Business logic
│   │   ├── models/                  # Data models
│   │   └── repositories/            # Data access layer
│   ├── src/main/resources/
│   │   ├── application.yml          # Application configuration
│   │   └── db/migration/            # Database migrations
│   ├── docker-compose.yml           # Docker configuration
│   ├── .env.example                 # Environment template
│   ├── generate-credentials.sh       # Secure credential generation
│   └── .env                         # Environment variables (create this)
├── design-docs/                     # Comprehensive documentation
│   ├── frontend-design.md           # Frontend architecture
│   └── backend-design.md           # Backend architecture
└── README.md
```

## 🔧 Configuration

### Environment Variables

The application uses environment variables for secrets and service configuration. See **`backend/ENVIRONMENT_SETUP.md`** and **`backend/.env.example`** for placeholders and guidance.

⚠️ **Security**: Never commit **`backend/.env`**. In **production**, set strong values for database credentials, `JWT_SECRET`, Twilio/SendGrid keys, admin passwords, and enrollment/survey-access settings. Local `docker-compose.yml` may use **development defaults** for convenience—replace them for real deployments.

### Database

The application uses PostgreSQL with Flyway for database migrations. The database will be automatically created and migrated when you start the backend.

### Services

- **Twilio**: For SMS verification and notifications
- **SendGrid**: For email notifications
- **PostgreSQL**: For data persistence

## 🚀 Deployment

### Production Setup

1. Create production environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Generate secure credentials:
   ```bash
   cd backend
   ./generate-credentials.sh
   ```

3. Update environment variables with production values

4. Deploy using Docker Compose:
   ```bash
   cd backend
   docker-compose up -d
   ```

### Environment-Specific Configuration

- **Development**: Use local database and test credentials
- **Production**: Use production database and real service credentials

## 📚 API Documentation (summary)

Public participant flows (many require **`X-Survey-Access-Token`** when survey access is enabled):

- `POST /api/otp/start`, `POST /api/otp/check` — OTP via Twilio Verify  
- `POST /api/participants/*` — validation, verification check, resend link (as implemented)  
- `POST /api/eligibility/check-ip` — IP-based signup cooldown  
- `GET /api/enrollment/status` — open/closed enrollment + survey-access flag  
- `POST /api/enrollment/access-token` — issue scoped survey-access token (password body)

Admin (**Bearer** admin JWT unless noted):

- `POST /api/admin/login` — admin JWT  
- `GET /api/admin/invitations` — optional `enrolledFrom` / `enrolledTo` (**LocalDate**) for DB filtering  
- `POST /api/admin/invitations/preview-links`, `POST /api/admin/invitations/bulk-complete-by-links` — bulk complete by link URLs  
- `GET/PUT /api/admin/enrollment/config` — requires **`X-Enrollment-Access-Token`** after unlock  
- `POST /api/admin/enrollment/access-token` — enrollment-settings unlock (password body)

See **`design-docs/backend-design.md`** for a fuller endpoint list and security details.

## 🛠️ Development

### Backend Development

```bash
cd backend
./mvnw spring-boot:run
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Database Migrations

Migrations are automatically applied on startup. To create new migrations:

1. Create SQL file in `src/main/resources/db/migration/`
2. Follow naming convention: `V{version}__{description}.sql`

## 🔒 Security

- **Secrets in environment** (and/or server-only `.env`), not in git  
- **Admin JWT** for `/api/admin/**`; additional **scoped JWTs** for enrollment settings and survey access  
- **BCrypt** for enrollment/survey access password material where configured  
- **JWT verification** and configurable expiration  
- **`.env` / `.env.example`**: real values stay local; use `generate-credentials.sh` where applicable  
- **CORS** configured for the web app origin(s)

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of Howard University's research study on AI in Healthcare Decision Making.

## 🆘 Support

For questions or issues:
- Email: ai@networks.howard.edu
- Phone: (240) 428-8442

## 🏛️ Research Team

- Jae Eun Chung, PhD
- Jiang Li, PhD
- Meirong Liu, PhD
- Amy Quarkume, PhD

---

**Howard University Research Department**  
AI for Health Study
