# intelligent-cv

API for Intelligent CV automation project.

## Project Structure

- `src/config` - environment and database configuration
- `src/controllers` - request handlers
- `src/middleware` - Express middleware (errors, 404)
- `src/routes` - API routes
- `src/services` - business logic
- `tests` - integration tests

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
```

The app automatically selects:

- `MONGODB_URI_DEV` when `NODE_ENV` is not `production`
- `MONGODB_URI_PROD` when `NODE_ENV=production`

## Run (development)

```bash
npm run dev
```

## Run (production)

```bash
npm start
```

## Test

```bash
npm test
```

## MongoDB Collections Created on Startup

The server ensures these collections exist:

- `hr`
- `candidates`
- `job_posts`
- `submitted_applications`
- `uploaded_resumes`

## Health Endpoint

- `GET /health`

## HR Endpoint

- `POST /hr/registration`
- Content-Type: `multipart/form-data` or `application/x-www-form-urlencoded`
- `POST /hr/login`
- Content-Type: `application/json`
- `POST /hr/logout`
- Uses cookies: `access_tokens`, `refresh_tokens`

Login request body:

```json
{
	"email": "hr@example.com",
	"password": "yourPassword"
}
```

On successful login:

- Response message: `successfully logged in`
- Sets secure HttpOnly cookies: `access_tokens`, `refresh_tokens`
- Stores generated tokens in HR document arrays: `access_tokens`, `refresh_tokens`
