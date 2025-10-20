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
- **Admin Dashboard**: http://localhost:5173/admin-login

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

The application requires several environment variables. See `backend/ENVIRONMENT_SETUP.md` for detailed configuration instructions.

⚠️ **Security Notice**: The application uses environment-based credential management with no hardcoded defaults. You must set secure credentials or the application will not start.

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

- **Environment-based credentials**: All sensitive data stored in environment variables
- **No hardcoded defaults**: Application won't start without proper configuration
- **Secure credential generation**: Use `generate-credentials.sh` for random credentials
- **JWT tokens**: For admin authentication with configurable expiration
- **CORS configured**: For frontend-backend communication
- **Database credentials**: Not committed to version control
- **Credential rotation**: Easy to rotate credentials by updating environment variables

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
