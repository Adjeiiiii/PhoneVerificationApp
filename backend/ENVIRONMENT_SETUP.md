# Environment Setup

Configuration is driven by **environment variables** (Docker Compose loads **`backend/.env`**). Never commit a real **`.env`** file.

## 1. Files to copy

From the **`backend`** directory:

```bash
cp .env.example .env
```

Optional: use `docker-compose.example.yml` as a reference; many teams use the repo’s `docker-compose.yml` with `.env` overrides.

## 2. `.env` contents (checklist)

Use **`backend/.env.example`** as the authoritative list of variable names. Typical groups:

| Area | Variables (examples) |
|------|----------------------|
| Database | `POSTGRES_*`, `DB_*`, `DB_SSL_MODE`, `DB_POOL_MAX` |
| Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `VERIFY_SERVICE_SID`, `MESSAGING_SERVICE_SID` |
| SendGrid | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` |
| Admin JWT | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRATION` |
| Enrollment settings gate | `ENROLLMENT_SETTINGS_PASSWORD` or `ENROLLMENT_SETTINGS_PASSWORD_HASH`, `ENROLLMENT_ACCESS_TOKEN_EXPIRATION_MS` |
| Survey access (optional defaults) | `SURVEY_ACCESS_PASSWORD` or `SURVEY_ACCESS_PASSWORD_HASH`, `SURVEY_ACCESS_TOKEN_EXPIRATION_MS` |
| Optional | `BITLY_API_TOKEN`, `SERVER_PORT`, `FLYWAY_ENABLED`, `SHORTLINK_BASE_URL` |

Survey access can also be **managed in the database** via Enrollment Settings (toggle + password); env vars provide bootstrap/fallback behavior. See **`design-docs/backend-design.md`** and **`application.yml`**.

## 3. Generate strong secrets (optional)

```bash
cd backend
./generate-credentials.sh
```

Copy generated values into `.env` as appropriate.

## 4. Run

```bash
cd backend
docker compose up --build
```

## Production

- Create `.env` **on the server** with production values.  
- Use long random **`JWT_SECRET`**, unique DB passwords, and real Twilio/SendGrid credentials.  
- Prefer **hashed** enrollment/survey passwords where your ops model supports it (`*_PASSWORD_HASH`).
