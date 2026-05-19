# AI Healthcare API Integration Guide

**Version:** 1.0.0  
**Last Updated:** 2026-05-19  
**Base URL:** `http://localhost:8000/api/v1` (dev) | `https://api.healthcaresystem.com/api/v1` (prod)

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [WebSocket Integration](#websocket-integration)
8. [Code Examples](#code-examples)
9. [FAQ](#faq)

---

## Quick Start

### 1. Register a New Account

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "role": "PATIENT"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "PATIENT",
  "is_active": true,
  "created_at": "2026-05-19T10:30:00Z"
}
```

### 2. Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=SecurePass123!"
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

The token is also automatically set as an **httpOnly cookie** for browser clients.

### 3. Use the API

```bash
curl -X GET http://localhost:8000/api/v1/patients/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Authentication

### Overview

The API uses JWT (JSON Web Tokens) for authentication with tokens stored in **httpOnly cookies** for security.

### Token Storage

- **Cookies (Recommended):** Automatically included in all requests
- **Authorization Header:** `Authorization: Bearer <token>`
- **Duration:** 24 hours (configurable)

### Password Requirements

Passwords must meet these criteria:
- **Minimum length:** 8 characters
- **Uppercase letters:** At least 1
- **Lowercase letters:** At least 1
- **Numbers:** At least 1
- **Special characters:** At least 1 (e.g., `!@#$%^&*`)

Example valid password: `SecurePass123!`

### Endpoints

#### POST `/auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "PATIENT"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "PATIENT",
  "is_active": true,
  "created_at": "2026-05-19T10:30:00Z"
}
```

#### POST `/auth/login`

Authenticate and receive access token.

**Request:**
```
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=SecurePass123!
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Headers:** Includes `Set-Cookie: Authorization=...`

#### POST `/auth/change-password`

Change your password (requires authentication).

**Request:**
```json
{
  "old_password": "SecurePass123!",
  "new_password": "NewSecurePass456!"
}
```

**Response:** `204 No Content`

---

## API Endpoints

### Patient Profile

#### GET `/patients/me`

Retrieve current patient's profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "patient@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "PATIENT",
  "is_active": true,
  "created_at": "2026-05-19T10:30:00Z",
  "profile": {
    "date_of_birth": "1990-01-15",
    "blood_group": "O+",
    "chronic_conditions": ["asthma", "diabetes"],
    "emergency_contact": "+1234567890"
  }
}
```

#### POST `/patients/me`

Update patient profile.

**Request:**
```json
{
  "date_of_birth": "1990-01-15",
  "blood_group": "O+",
  "chronic_conditions": ["asthma"],
  "emergency_contact": "+1234567890"
}
```

**Response:** `200 OK` - Updated profile object

### AI Diagnosis

#### POST `/diagnosis/analyze`

Analyze symptoms using XGBoost ML model and Ollama.

**Request:**
```json
{
  "symptoms": ["fever", "cough", "fatigue"],
  "duration_days": 3,
  "severity": "moderate"
}
```

**Response:** `200 OK`
```json
{
  "primary_diagnosis": "Common Cold",
  "confidence": 85,
  "differential_diagnoses": [
    {
      "disease": "Influenza",
      "confidence": 72,
      "specialist": "General Physician"
    },
    {
      "disease": "Bronchitis",
      "confidence": 58,
      "specialist": "Pulmonologist"
    }
  ],
  "specialist_recommendation": "General Physician",
  "record_id": "uuid"
}
```

**Rate Limit:** 10 requests/minute per user

### Medical Records

#### GET `/records`

List medical records (with pagination and filters).

**Query Parameters:**
- `skip` (int, default=0): Pagination offset
- `limit` (int, default=10): Number of records
- `status` (string): Filter by "pending", "reviewed", or "archived"

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "symptoms": ["fever", "cough"],
    "diagnosis": "Common Cold",
    "diagnosis_confidence": 85,
    "doctor_notes": "Patient improving. Continue treatment.",
    "status": "reviewed",
    "created_at": "2026-05-19T10:30:00Z"
  }
]
```

#### GET `/records/{record_id}`

Get single record details.

**Response:** `200 OK` - Record object (see above)

#### PATCH `/records/{record_id}`

Update record (doctors add notes).

**Request:**
```json
{
  "doctor_notes": "Patient responding well to treatment.",
  "status": "reviewed"
}
```

### Appointments

#### GET `/appointments`

List appointments.

**Query Parameters:**
- `skip`, `limit` (pagination)
- `status` (filter: "scheduled", "completed", "cancelled", "rescheduled")

#### POST `/appointments`

Create new appointment.

**Request:**
```json
{
  "doctor_id": "uuid",
  "appointment_date": "2026-05-25T14:30:00",
  "reason": "Follow-up consultation"
}
```

**Response:** `201 Created` - Appointment object

#### PATCH `/appointments/{appointment_id}`

Reschedule or cancel appointment.

**Request:**
```json
{
  "appointment_date": "2026-05-26T15:00:00",
  "status": "rescheduled"
}
```

### Prescriptions

#### GET `/prescriptions`

List active prescriptions.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "medication": "Amoxicillin",
    "dosage": "500mg",
    "frequency": "3 times daily",
    "duration_days": 7,
    "status": "active",
    "created_at": "2026-05-19T10:30:00Z"
  }
]
```

### Messages

#### POST `/messages`

Send message to another user.

**Request:**
```json
{
  "to_user_id": "uuid",
  "content": "I'm experiencing side effects from the medication."
}
```

#### GET `/messages`

Get inbox messages.

**Query Parameters:** `skip`, `limit`

#### GET `/messages/{user_id}`

Get conversation with specific user.

### Notifications

#### GET `/notifications`

Get user notifications.

**Query Parameters:** `skip`, `limit`

#### PATCH `/notifications/{notification_id}`

Mark as read.

**Request:**
```json
{
  "is_read": true
}
```

### Admin Operations (Admin role required)

#### GET `/admin/users`

List all users with filters.

**Query Parameters:**
- `role` ("PATIENT", "DOCTOR", "ADMIN")
- `skip`, `limit`

#### PATCH `/admin/users/{user_id}/status`

Activate/deactivate user.

**Request:**
```json
{
  "is_active": false
}
```

#### GET `/admin/audit-log`

Get audit log entries.

**Query Parameters:** `skip`, `limit`, `action`

#### GET `/admin/statistics`

System statistics and metrics.

---

## Data Models

### User

```typescript
{
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  is_active: boolean;
  created_at: string;
  last_login?: string;
}
```

### PatientProfile

```typescript
{
  date_of_birth?: string;
  blood_group?: "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-";
  chronic_conditions?: string[];
  emergency_contact?: string;
}
```

### MedicalRecord

```typescript
{
  id: string;
  patient_id: string;
  doctor_id?: string;
  symptoms: string[];
  diagnosis?: string;
  diagnosis_confidence?: number;
  doctor_notes?: string;
  status: "pending" | "reviewed" | "archived";
  created_at: string;
}
```

### Appointment

```typescript
{
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled";
  reason?: string;
  created_at: string;
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "User with this email already exists.",
    "status_code": 400,
    "details": {}
  },
  "data": null,
  "timestamp": "2026-05-19T10:30:00Z"
}
```

### Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Bad Request | Invalid email format, weak password |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Record does not exist |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error (see logs) |

### Common Errors

#### 400 - Bad Request

```json
{
  "error": {
    "message": "Invalid blood group. Must be one of: O+, O-, A+, A-, B+, B-, AB+, AB-",
    "status_code": 400
  }
}
```

#### 401 - Unauthorized

```json
{
  "error": {
    "message": "Incorrect email or password",
    "status_code": 401
  }
}
```

#### 403 - Forbidden

```json
{
  "error": {
    "message": "Not authorized to view this record",
    "status_code": 403
  }
}
```

#### 429 - Rate Limited

```json
{
  "error": {
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "status_code": 429
  }
}
```

---

## Rate Limiting

Rate limits are applied per user/IP:

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 5 req | 1 min |
| Diagnosis | 10 req | 1 min |
| General API | 100 req | 1 min |

**Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1652942400
```

---

## WebSocket Integration

### Connect

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws?token=<access_token>');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Notification:', message);
};
```

### Message Types

- **notification**: New notification (appointment, message, etc.)
- **appointment**: Appointment status change
- **message**: New message from user
- **diagnosis**: Diagnosis result ready
- **system**: System alerts

### Example Message

```json
{
  "type": "notification",
  "payload": {
    "title": "New appointment",
    "message": "Dr. Smith scheduled an appointment for 2026-05-25 at 2:30 PM",
    "related_id": "appointment-uuid"
  },
  "timestamp": "2026-05-19T10:30:00Z"
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
class HealthcareApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = 'http://localhost:8000/api/v1') {
    this.baseUrl = baseUrl;
  }

  async register(email: string, password: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'PATIENT' }),
    });
    return response.json();
  }

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${email}&password=${password}`,
      credentials: 'include', // Include cookies
    });
    const data = await response.json();
    this.token = data.access_token;
  }

  async analyzeSymptons(symptoms: string[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/diagnosis/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        symptoms,
        duration_days: 3,
        severity: 'moderate',
      }),
      credentials: 'include',
    });
    return response.json();
  }
}

// Usage
const client = new HealthcareApiClient();
await client.register('user@example.com', 'SecurePass123!');
await client.login('user@example.com', 'SecurePass123!');
const diagnosis = await client.analyzeSymptons(['fever', 'cough']);
console.log('Diagnosis:', diagnosis);
```

### Python

```python
import requests
from typing import Optional

class HealthcareApiClient:
    def __init__(self, base_url: str = 'http://localhost:8000/api/v1'):
        self.base_url = base_url
        self.session = requests.Session()
        self.token: Optional[str] = None

    def register(self, email: str, password: str) -> dict:
        response = self.session.post(
            f'{self.base_url}/auth/register',
            json={'email': email, 'password': password, 'role': 'PATIENT'},
        )
        response.raise_for_status()
        return response.json()

    def login(self, email: str, password: str) -> None:
        response = self.session.post(
            f'{self.base_url}/auth/login',
            data={'username': email, 'password': password},
        )
        response.raise_for_status()
        self.token = response.json()['access_token']
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})

    def analyze_symptoms(self, symptoms: list[str]) -> dict:
        response = self.session.post(
            f'{self.base_url}/diagnosis/analyze',
            json={
                'symptoms': symptoms,
                'duration_days': 3,
                'severity': 'moderate',
            },
        )
        response.raise_for_status()
        return response.json()

# Usage
client = HealthcareApiClient()
client.register('user@example.com', 'SecurePass123!')
client.login('user@example.com', 'SecurePass123!')
diagnosis = client.analyze_symptoms(['fever', 'cough'])
print(f"Diagnosis: {diagnosis['primary_diagnosis']}")
```

---

## FAQ

### Q: How do I get an API token?

**A:** Call `/auth/login` with your email and password. The token is returned in the response and automatically stored as an httpOnly cookie.

### Q: Can I use the same credentials for multiple clients?

**A:** Yes, you can login from multiple devices/clients simultaneously. Each login generates a new token.

### Q: What happens when my token expires?

**A:** You'll receive a `401 Unauthorized` response. Call `/auth/login` again to get a new token.

### Q: Is the API available over HTTP?

**A:** Development uses HTTP (localhost), but production requires HTTPS only.

### Q: How long does diagnosis analysis take?

**A:** Typically 1-3 seconds. The system uses a pre-cached XGBoost model with Ollama fallback for text generation.

### Q: Can I bulk create records?

**A:** Not directly, but you can create them sequentially. Contact support for bulk import needs.

### Q: Are medical records encrypted?

**A:** All data is stored in the database. Sensitive fields (SSN, etc.) should be encrypted at the application level.

### Q: How do I report a bug or request a feature?

**A:** Contact the support team with details. Provide API request/response logs if possible.

---

## Support

For questions or issues:
- **Email:** api-support@healthcaresystem.com
- **Docs:** https://docs.healthcaresystem.com
- **Status:** https://status.healthcaresystem.com
- **GitHub Issues:** https://github.com/healthcaresystem/api/issues

---

**Generated:** 2026-05-19  
**Last Updated:** 2026-05-19
