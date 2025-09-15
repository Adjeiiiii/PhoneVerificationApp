# Phone Verification App

A full-stack application for phone number verification and survey link distribution, built for Howard University's AI for Health research study.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Spring Boot + Java 17
- **Database**: PostgreSQL
- **SMS Service**: Twilio
- **Email Service**: SendGrid
- **Containerization**: Docker + Docker Compose

## 🚀 Quick Start

### Prerequisites

- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Java 17](https://openjdk.org/projects/jdk/17/) (for local development)

### 1. Clone the Repository

```bash
git clone https://github.com/Adjeiiiii/PhoneVerificationApp.git
cd PhoneVerificationApp
```

### 2. Environment Setup

#### Backend Configuration

1. Navigate to the backend directory:
   ```bash
   cd smsbackend
   ```

2. Create environment file:
   ```bash
   cp docker-compose.example.yml docker-compose.yml
   ```

3. Create `.env` file with your credentials:
   ```bash
   cat > .env << 'EOF'
   # Database Configuration
   POSTGRES_DB=hu_research
   POSTGRES_USER=hu_app
   POSTGRES_PASSWORD=your_database_password
   DB_HOST=db
   DB_PORT=5432
   DB_NAME=hu_research
   DB_USER=hu_app
   DB_PASSWORD=your_database_password
   DB_SSL_MODE=disable
   DB_POOL_MAX=10

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   VERIFY_SERVICE_SID=your_verify_service_sid
   MESSAGING_SERVICE_SID=your_messaging_service_sid

   # SendGrid Configuration
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=your_email@domain.com
   SENDGRID_FROM_NAME=Your Team Name

   # App Configuration
   SERVER_PORT=8080
   FLYWAY_ENABLED=true
   EOF
   ```

#### Frontend Configuration

1. Navigate to the frontend directory:
   ```bash
   cd ../client-phone-verification
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
cd smsbackend
docker-compose up --build

# In a new terminal, start frontend
cd client-phone-verification
npm run dev
```

#### Option B: Local Development

1. **Start Backend:**
   ```bash
   cd smsbackend
   docker-compose up db  # Start only database
   ./mvnw spring-boot:run  # Start Spring Boot app
   ```

2. **Start Frontend:**
   ```bash
   cd client-phone-verification
   npm run dev
   ```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Admin Dashboard**: http://localhost:5173/admin-login

## 📁 Project Structure

```
PhoneVerificationApp/
├── client-phone-verification/     # React frontend
│   ├── src/
│   │   ├── pages/                 # React components
│   │   ├── contexts/              # React context providers
│   │   ├── utils/                 # API utilities
│   │   └── routes/                # Route components
│   ├── package.json
│   └── vite.config.ts
├── smsbackend/                    # Spring Boot backend
│   ├── src/main/java/edu/howard/research/smsbackend/
│   │   ├── controllers/           # REST controllers
│   │   ├── services/              # Business logic
│   │   ├── models/                # Data models
│   │   └── repositories/          # Data access layer
│   ├── src/main/resources/
│   │   ├── application.yml        # Application configuration
│   │   └── db/migration/          # Database migrations
│   ├── docker-compose.yml         # Docker configuration
│   ├── docker-compose.example.yml # Environment template
│   └── .env                       # Environment variables (create this)
└── README.md
```

## 🔧 Configuration

### Environment Variables

The application requires several environment variables. See `smsbackend/ENVIRONMENT_SETUP.md` for detailed configuration instructions.

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
   cp smsbackend/docker-compose.example.yml smsbackend/docker-compose.yml
   ```

2. Update environment variables with production values

3. Deploy using Docker Compose:
   ```bash
   cd smsbackend
   docker-compose up -d
   ```

### Environment-Specific Configuration

- **Development**: Use local database and test credentials
- **Production**: Use production database and real service credentials

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/otp/start` - Start phone verification
- `POST /api/otp/check` - Verify OTP code
- `POST /api/admin/login` - Admin authentication

### Survey Management

- `POST /api/survey/assign` - Assign survey link to participant
- `GET /api/survey/links` - List available survey links
- `POST /api/survey/upload` - Upload new survey links

### Participant Management

- `GET /api/participants` - List participants
- `GET /api/participants/{id}` - Get participant details
- `PUT /api/participants/{id}` - Update participant

## 🛠️ Development

### Backend Development

```bash
cd smsbackend
./mvnw spring-boot:run
```

### Frontend Development

```bash
cd client-phone-verification
npm run dev
```

### Database Migrations

Migrations are automatically applied on startup. To create new migrations:

1. Create SQL file in `src/main/resources/db/migration/`
2. Follow naming convention: `V{version}__{description}.sql`

## 🔒 Security

- All sensitive credentials are stored in environment variables
- JWT tokens for admin authentication
- CORS configured for frontend-backend communication
- Database credentials are not committed to version control

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
