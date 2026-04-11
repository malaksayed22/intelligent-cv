# intelligent-cv

API for Intelligent CV automation project.

## Setup

```bash
npm install
```

## Environment Variables

Create `.env` at the project root with:

```bash
NODE_ENV=development
PORT=8000
MONGODB_URI_DEV=mongodb://127.0.0.1:27017/smartHire?authSource=hr
MONGODB_DB_NAME=smartHire
JWT_SECRET=replace_with_strong_access_secret
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=no-reply@smarthire.com
SMTP_SECURE=false
```

## Run

```bash
npm run dev
```

## Test

```bash
npm test
```

## Endpoints

- `GET /health`
- `POST /hr/registration` (form-data or x-www-form-urlencoded)
- `POST /hr/login` (application/json)
- `POST /hr/logout` (uses active session cookies)
- `PUT /hr/email-confirmation` (form-data or x-www-form-urlencoded, uses active session cookies)

## Email Confirmation Flow

1. Call `PUT /hr/email-confirmation` without `code` to send a 6-digit code.
2. Call `PUT /hr/email-confirmation` with form field `code` to verify.
3. Code expires after 10 minutes.

Validation behavior:

- If `is_confirmed` is already true: `400 already confirmed`
- If code is invalid or expired: `400 wrong code`
- If no active session tokens in cookies: `400 no active sessions`

