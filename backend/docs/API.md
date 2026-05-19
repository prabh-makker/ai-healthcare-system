# AI Healthcare API Reference

## Overview

The AI Healthcare Diagnosis System API provides a comprehensive REST interface for:
- **Authentication**: User registration, login, password management with JWT + httpOnly cookies
- **Diagnosis**: AI-powered symptom analysis using XGBoost + Ollama NLP
- **Patient Management**: Patient profiles, medical records, health history
- **Appointments**: Schedule and manage medical appointments with availability tracking
- **Prescriptions**: Track and manage patient medications with status lifecycle
- **Doctor Calendar**: Doctor scheduling, availability management, time slot booking
- **Messages**: Patient-doctor secure messaging and conversation history
- **Notifications**: Real-time alerts, system notifications, event tracking
- **Admin**: System administration, user management, audit logging, metrics
- **Attendance**: Medical professional attendance tracking and clock in/out
- **Websocket**: Real-time bidirectional communication for live updates

## Architecture

### Tech Stack
- **Framework**: FastAPI 0.104+ (async Python web framework)
- **Database**: SQLAlchemy ORM + PostgreSQL/SQLite
- **Auth**: JWT tokens + httpOnly secure cookies
- **ML**: XGBoost model for diagnosis + Ollama (llama2) for NLP
- **Monitoring**: Prometheus metrics, Sentry error tracking
- **Caching**: Redis (optional) for rate limiting and response caching
- **Validation**: Pydantic 2.0 with strict type checking

### Key Features
- Role-based access control (PATIENT, DOCTOR, ADMIN)
- Rate limiting per endpoint
- Audit logging for compliance
- Structured error responses
- Medical data (PHI) protection headers
- CORS enabled for frontend integration
- Health checks and metrics endpoints

## Authentication

### JWT + httpOnly Cookie Flow

#### 1. Register New User
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "SecurePass123!",
  "role": "PATIENT"
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "patient@example.com",
    "role": "PATIENT",
    "is_active": true,
    "created_at": "2026-05-19T15:30:00Z"
  },
  "timestamp": "2026-05-19T15:30:00Z"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 digit (0-9)
- At least 1 special character (!@#$%^&*)

**Restrictions:**
- Only PATIENT role allowed for self-registration
- Doctors and admins created via admin panel only
- Email must be unique

#### 2. Login
```
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=patient@example.com&password=SecurePass123!

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  },
  "timestamp": "2026-05-19T15:30:00Z"
}

Headers (automatic):
Set-Cookie: access_token_cookie=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...;
    HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/
```

**Token Lifetime:**
- Default: 24 hours (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)
- Refresh: Not rotated (use new login)
- Expiration error: 401 Unauthorized

**Cookie Security:**
- HttpOnly: Not accessible via JavaScript (XSS protection)
- Secure: Only sent over HTTPS (production)
- SameSite=Lax: CSRF protection
- Automatic: Browser sends with every request

#### 3. Get Current User
```
GET /api/v1/auth/me
Authorization: Bearer <token>
Cookie: access_token_cookie=<token>

Response 200:
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "patient@example.com",
    "role": "PATIENT",
    "is_active": true,
    "created_at": "2026-05-19T15:30:00Z"
  },
  "timestamp": "2026-05-19T15:30:00Z"
}
```

#### 4. Logout
```
POST /api/v1/auth/logout
Authorization: Bearer <token>

Response 204 No Content

Headers (automatic):
Set-Cookie: access_token_cookie=; Max-Age=0; Path=/
```

#### 5. Change Password
```
POST /api/v1/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "old_password": "OldPass123!",
  "new_password": "NewPass456!"
}

Response 204 No Content
```

**Validation:**
- Old password must match current password
- New password must meet complexity requirements
- New password cannot be same as old password

### Security Headers (All Responses)

```
X-Frame-Options: DENY                              # Clickjacking protection
X-Content-Type-Options: nosniff                    # MIME sniffing protection
X-XSS-Protection: 1; mode=block                    # XSS filter
Strict-Transport-Security: max-age=31536000; includeSubDomains  # Production only
Content-Security-Policy: default-src 'self'; ...   # Production only
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-----------|
| **PATIENT** | View own profile, records, appointments; upload medical data; send messages to doctor; view diagnoses |
| **DOCTOR** | View assigned patients; write medical records & diagnoses; manage appointments; write prescriptions; view audit logs of own actions |
| **ADMIN** | Full system access; user management; audit logs; system metrics; configuration changes |

**Access Denied Example:**
```
Response 403 Forbidden:
{
  "success": false,
  "error": {
    "message": "Insufficient permissions for this operation",
    "status_code": 403
  },
  "data": null,
  "timestamp": "2026-05-19T15:30:00Z"
}
```

## Response Format

### Standard Success Response

```json
{
  "success": true,
  "data": {
    // endpoint-specific data
  },
  "timestamp": "2026-05-19T15:30:01Z"
}
```

### Standard Error Response

```json
{
  "success": false,
  "error": {
    "message": "User not found",
    "status_code": 404
  },
  "data": null,
  "timestamp": "2026-05-19T15:30:01Z"
}
```

### Validation Error Response (422)

```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "status_code": 422,
    "details": [
      {
        "loc": ["body", "email"],
        "msg": "invalid email format",
        "type": "value_error.email"
      },
      {
        "loc": ["body", "password"],
        "msg": "ensure this value has at least 8 characters",
        "type": "value_error.any_str.min_length"
      }
    ]
  },
  "data": null,
  "timestamp": "2026-05-19T15:30:01Z"
}
```

## Endpoint Groups

### Auth Endpoints (`/api/v1/auth`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/register` | ❌ | — | Register new PATIENT user |
| POST | `/login` | ❌ | — | Login (get JWT + cookie) |
| POST | `/logout` | ✅ | Any | Logout (clear cookie) |
| GET | `/me` | ✅ | Any | Get current user profile |
| POST | `/change-password` | ✅ | Any | Change password |

### Diagnosis Endpoints (`/api/v1/diagnosis`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/analyze` | ✅ | PATIENT | Analyze symptoms (AI diagnosis) |
| GET | `/history` | ✅ | PATIENT | Get diagnosis history |
| POST | `/validate` | ✅ | DOCTOR | Expert validation of diagnosis |
| GET | `/templates` | ✅ | ADMIN | View response templates (cache) |

**Diagnosis Response:**
```json
{
  "primary_diagnosis": "Common Cold",
  "confidence_score": 78.5,
  "alternative_diagnoses": [
    {"diagnosis": "Allergic Rhinitis", "confidence": 62.3},
    {"diagnosis": "Acute Bronchitis", "confidence": 45.1}
  ],
  "recommended_specialist": "General Physician",
  "severity_assessment": "Mild",
  "recommendations": [
    "Rest for 5-7 days",
    "Stay hydrated",
    "Monitor fever"
  ],
  "disclaimer": "This is an AI-generated assessment. Please consult with a healthcare provider."
}
```

### Patient Endpoints (`/api/v1/patients`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/me` | ✅ | PATIENT | Get own profile |
| POST | `/me` | ✅ | PATIENT | Update own profile |
| GET | `/{id}` | ✅ | DOCTOR/ADMIN | Get patient details |
| GET | `/` | ✅ | DOCTOR/ADMIN | List patients (with pagination) |

**Patient Profile Update:**
```json
{
  "date_of_birth": "1990-05-19T00:00:00Z",
  "blood_group": "O+",
  "chronic_conditions": ["Hypertension", "Type 2 Diabetes"],
  "emergency_contact": "+1-555-0123"
}
```

### Medical Records Endpoints (`/api/v1/records`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | ✅ | PATIENT/DOCTOR/ADMIN | List records (filtered by role) |
| POST | `/` | ✅ | DOCTOR/ADMIN | Create record |
| GET | `/{id}` | ✅ | PATIENT/DOCTOR/ADMIN | Get record details |
| PUT | `/{id}` | ✅ | DOCTOR/ADMIN | Update record |
| DELETE | `/{id}` | ✅ | ADMIN | Delete record |
| GET | `/stats/summary` | ✅ | ADMIN | Get system statistics |

**Record Statuses:**
- `pending` — Awaiting doctor review
- `reviewed` — Doctor has reviewed
- `archived` — Closed/old record

### Appointment Endpoints (`/api/v1/appointments`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | ✅ | PATIENT/DOCTOR | List appointments |
| POST | `/` | ✅ | PATIENT | Book appointment |
| GET | `/{id}` | ✅ | PATIENT/DOCTOR | Get appointment |
| PUT | `/{id}` | ✅ | PATIENT/DOCTOR | Reschedule |
| DELETE | `/{id}` | ✅ | PATIENT/DOCTOR | Cancel appointment |

**Appointment Status:**
- `upcoming` — Scheduled for future
- `completed` — Finished
- `cancelled` — User-cancelled
- `no_show` — Patient didn't show up

### Prescription Endpoints (`/api/v1/prescriptions`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | ✅ | PATIENT/DOCTOR | List prescriptions |
| POST | `/` | ✅ | DOCTOR | Create prescription |
| GET | `/{id}` | ✅ | PATIENT/DOCTOR | Get prescription |
| PUT | `/{id}` | ✅ | DOCTOR | Update prescription |
| DELETE | `/{id}` | ✅ | DOCTOR | Discontinue prescription |

**Prescription Status:**
- `active` — Currently taking medication
- `completed` — Course finished
- `discontinued` — Stopped by doctor

### Message Endpoints (`/api/v1/messages`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | ✅ | PATIENT/DOCTOR | List conversations |
| POST | `/` | ✅ | PATIENT/DOCTOR | Send message |
| GET | `/{conversation_id}` | ✅ | PATIENT/DOCTOR | Get conversation thread |

### Notification Endpoints (`/api/v1/notifications`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | ✅ | PATIENT/DOCTOR | List notifications |
| POST | `/{id}/read` | ✅ | PATIENT/DOCTOR | Mark as read |
| DELETE | `/{id}` | ✅ | PATIENT/DOCTOR | Delete notification |

### Doctor Calendar Endpoints (`/api/v1/doctor-calendar`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/availability` | ✅ | PATIENT | Get doctor availability |
| POST | `/slots` | ✅ | DOCTOR/ADMIN | Create time slot |
| PUT | `/slots/{id}` | ✅ | DOCTOR/ADMIN | Update slot |
| DELETE | `/slots/{id}` | ✅ | DOCTOR/ADMIN | Delete slot |

### Attendance Endpoints (`/api/v1/attendance`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | ✅ | ADMIN | List attendance records |
| POST | `/` | ✅ | DOCTOR | Clock in/out |
| GET | `/{id}` | ✅ | ADMIN | Get attendance record |

### Admin Endpoints (`/api/v1/admin`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/users` | ✅ | ADMIN | List all users |
| POST | `/users` | ✅ | ADMIN | Create user |
| PUT | `/users/{id}` | ✅ | ADMIN | Update user |
| DELETE | `/users/{id}` | ✅ | ADMIN | Delete user |
| GET | `/audit-log` | ✅ | ADMIN | View audit log |
| POST | `/metrics` | ✅ | ADMIN | Get system metrics |

### Health Check Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/health` | ❌ | System health status |

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-05-19T15:30:00Z",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "ml_model": "ok"
  }
}
```

### Prometheus Metrics

| Path | Format | Authentication |
|------|--------|-----------------|
| `/metrics` | Prometheus text format | No (internal only in prod) |

## Rate Limiting

### Limits by Endpoint

| Endpoint | Window | Limit | Status Code |
|----------|--------|-------|-------------|
| `/auth/login` | 1 minute | 5 attempts | 429 |
| `/auth/register` | 1 minute | 3 attempts | 429 |
| `/diagnosis/analyze` | 1 hour | 10 requests | 429 |
| `/auth/change-password` | 1 minute | 3 attempts | 429 |
| Other endpoints | 1 minute | 100 requests | 429 |

### Rate Limit Headers

```
X-RateLimit-Limit: 100           # Max requests in window
X-RateLimit-Remaining: 42        # Requests left in current window
X-RateLimit-Reset: 1684594800    # Unix timestamp of window reset
Retry-After: 30                  # Seconds to wait before retrying (on 429)
```

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "message": "Rate limit exceeded. Maximum 5 attempts per minute.",
    "status_code": 429
  },
  "data": null,
  "timestamp": "2026-05-19T15:30:01Z"
}
```

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 204 | No Content | Success with no body (e.g., logout) |
| 400 | Bad Request | Invalid input, business logic error |
| 401 | Unauthorized | Missing/invalid JWT or cookie |
| 403 | Forbidden | Insufficient role permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email exists) |
| 422 | Unprocessable Entity | Validation error (see details) |
| 429 | Too Many Requests | Rate limited, use Retry-After |
| 500 | Internal Server Error | Backend error, contact support |

## Pagination

List endpoints support optional query parameters:

```
GET /api/v1/patients?skip=0&limit=20&role=PATIENT
```

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `skip` | integer | 0 | — | Records to skip (for offset pagination) |
| `limit` | integer | 50 | 100 | Max records returned per page |

**Paginated Response Format:**
```json
{
  "success": true,
  "data": [
    { /* record 1 */ },
    { /* record 2 */ }
  ],
  "pagination": {
    "skip": 0,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "timestamp": "2026-05-19T15:30:01Z"
}
```

## Filtering

List endpoints support optional filters (endpoint-specific):

```
GET /api/v1/appointments?skip=0&limit=20&status=upcoming&date_from=2026-05-19
```

Common filters:
- `status` — Filter by status (values depend on resource type)
- `role` — Filter by user role (PATIENT, DOCTOR, ADMIN)
- `date_from` — Filter records from date (ISO 8601)
- `date_to` — Filter records until date (ISO 8601)

## Websocket (Real-time)

### Connection

```
WS /api/v1/ws/{patient_id}/{user_id}?token=<jwt_token>
```

or via initial auth message:

```
WS /api/v1/ws/{patient_id}/{user_id}

Message 1 (auth):
{
  "type": "auth",
  "token": "<jwt_token>"
}
```

### Message Types

**Notification (server → client):**
```json
{
  "type": "notification",
  "data": {
    "id": "uuid",
    "title": "New Appointment",
    "message": "Dr. Smith has scheduled an appointment"
  }
}
```

**Message (server → client):**
```json
{
  "type": "message",
  "data": {
    "sender_id": "uuid",
    "sender_name": "Dr. Smith",
    "content": "How are you feeling today?",
    "timestamp": "2026-05-19T15:30:00Z"
  }
}
```

**Disconnect (server → client):**
```json
{
  "type": "disconnect",
  "reason": "User logged out"
}
```

## CORS Configuration

Cross-Origin Resource Sharing enabled for frontend integration:

**Allowed Origins:**
- `http://localhost:3000` (development)
- `https://aihealthcare.com` (production)

**Allowed Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS

**Allowed Headers:** Content-Type, Authorization

**Preflight Cache:** 10 minutes (max_age=600)

**Credentials:** Allowed (cookies sent with requests)

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/ai_healthcare
SQLALCHEMY_ECHO=false  # Set to true for SQL debugging

# Environment
ENVIRONMENT=development|staging|production
DEBUG=true  # More error details

# JWT & Auth
JWT_SECRET_KEY=<random-256-bit-key>
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
REFRESH_TOKEN_EXPIRE_DAYS=30

# ML & AI
OLLAMA_API_URL=http://localhost:11434
ML_MODEL_PATH=/path/to/models

# Redis (optional, for caching/rate limiting)
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379/0

# Monitoring (optional)
SENTRY_DSN=https://...@sentry.io/...
PROMETHEUS_METRICS_ENABLED=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## Testing

### Using curl

**Register:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "role": "PATIENT"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=Test123!@#" \
  -c cookies.txt  # Save cookies
```

**Authenticated Request:**
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <token>" \
  -b cookies.txt  # Use saved cookies
```

### Using Python requests

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"
session = requests.Session()

# Register
session.post(
    f"{BASE_URL}/auth/register",
    json={
        "email": "test@example.com",
        "password": "Test123!@#",
        "role": "PATIENT"
    }
)

# Login
response = session.post(
    f"{BASE_URL}/auth/login",
    data={"username": "test@example.com", "password": "Test123!@#"}
)
token = response.json()["data"]["access_token"]

# Authenticated request
response = session.get(
    f"{BASE_URL}/auth/me",
    headers={"Authorization": f"Bearer {token}"}
)
print(response.json())
```

### Postman Import

1. Open Postman
2. File → Import
3. Select: Link (or Folder → Raw text)
4. Paste: `http://localhost:8000/api/v1/openapi.json`
5. Click Import
6. Auto-generated collection with all endpoints ready to test

## Live API Documentation

- **Swagger UI**: http://localhost:8000/docs (development)
- **ReDoc**: http://localhost:8000/redoc (development)
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## Support & Issues

For questions, bugs, or feature requests:
- **GitHub Issues**: [ai-healthcare/issues](https://github.com/yourorg/ai-healthcare/issues)
- **Email**: support@aihealthcare.com
- **Docs**: [Full technical documentation](https://docs.aihealthcare.com)
