# Environment Setup

This project uses environment variables for sensitive configuration. Follow these steps to set up your environment.

## 1. Create Environment File

Copy the example environment file and fill in your actual credentials:

```bash
cp docker-compose.example.yml docker-compose.yml
```

## 2. Create .env File

Create a `.env` file in the `smsbackend` directory with your actual credentials:

```bash
# Database Configuration
POSTGRES_DB=hu_research
POSTGRES_USER=hu_app
POSTGRES_PASSWORD=your_actual_password_here
DB_HOST=db
DB_PORT=5432
DB_NAME=hu_research
DB_USER=hu_app
DB_PASSWORD=your_actual_password_here
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
```

## 3. Run the Application

```bash
docker-compose up --build
```

## Security Notes

- **Never commit the `.env` file to version control**
- The `.env` file is already added to `.gitignore`
- Use different credentials for development and production
- On production servers, create the `.env` file directly on the server

## Production Deployment

1. Copy `docker-compose.example.yml` to `docker-compose.yml` on your server
2. Create the `.env` file on the server with production credentials
3. Run `docker-compose up -d` to start the services
