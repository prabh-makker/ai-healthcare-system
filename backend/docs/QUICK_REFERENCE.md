# AI Healthcare API - Quick Reference

**Version:** 1.0.0 | **Base URL:** `/api/v1`

## Authentication Quick Start

```bash
# Register
curl -X POST /auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Login (get token)
curl -X POST /auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=SecurePass123!"

# Use token in requests
curl -X GET /patients/me \
  -H "Authorization: Bearer <access_token>"
```

## Common Endpoints

### Auth
- `POST /auth/register` - Create account
- `POST /auth/login` - Get token
- `POST /auth/change-password` - Change password (protected)

### Patient
- `GET /patients/me` - Get profile
- `POST /patients/me` - Update profile

### Diagnosis (AI)
- `POST /diagnosis/analyze` - XGBoost symptom analysis
- `GET /diagnosis/history` - Get past diagnoses

### Medical Records
- `GET /records` - List records (paginated, filterable)
- `GET /records/{id}` - Get single record
- `PATCH /records/{id}` - Update record (doctor notes)

### Appointments
- `GET /appointments` - List appointments
- `POST /appointments` - Create appointment
- `PATCH /appointments/{id}` - Reschedule/cancel

### Prescriptions
- `GET /prescriptions` - List prescriptions
- `GET /prescriptions/{id}` - Get details

### Messages
- `GET /messages` - Inbox
- `POST /messages` - Send message
- `GET /messages/{user_id}` - Conversation

### Notifications
- `GET /notifications` - Get notifications
- `PATCH /notifications/{id}` - Mark as read

### Admin (Admin only)
- `GET /admin/users` - List users
- `PATCH /admin/users/{id}/status` - Enable/disable
- `GET /admin/audit-log` - Audit log
- `GET /admin/statistics` - System stats

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 500 | Server Error |

## Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status_code": 400,
    "details": {}
  },
  "timestamp": "2026-05-19T10:30:00Z"
}
```

## Request Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

## Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1652942400
```

## Password Requirements

- 8+ characters
- Uppercase letter
- Lowercase letter
- Number
- Special character (!@#$%^&*)

Example: `SecurePass123!`

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth | 5 | 1 min |
| Diagnosis | 10 | 1 min |
| General | 100 | 1 min |

## Pagination

```
GET /records?skip=0&limit=10&status=pending
```

## Filtering

```
GET /records?status=reviewed
GET /appointments?status=scheduled
GET /prescriptions?status=active
```

## Sorting

```
?sort=created_at&order=desc
```

## User Roles

- `PATIENT` - Patient account (default)
- `DOCTOR` - Doctor account
- `ADMIN` - Administrator account

## Data Models

### User
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "PATIENT",
  "is_active": true,
  "created_at": "2026-05-19T10:30:00Z"
}
```

### Medical Record
```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "symptoms": ["fever", "cough"],
  "diagnosis": "Common Cold",
  "diagnosis_confidence": 85,
  "status": "reviewed"
}
```

### Appointment
```json
{
  "id": "uuid",
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "appointment_date": "2026-05-25T14:30:00",
  "status": "scheduled"
}
```

### Diagnosis Result
```json
{
  "primary_diagnosis": "Common Cold",
  "confidence": 85,
  "differential_diagnoses": [
    {"disease": "Influenza", "confidence": 72}
  ],
  "specialist_recommendation": "General Physician",
  "record_id": "uuid"
}
```

## WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws?token=<token>');
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Type:', msg.type); // notification, message, appointment, etc.
};
```

## CORS Headers

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
```

## Security Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000 (production only)
```

## Example Request

```bash
curl -X POST http://localhost:8000/api/v1/diagnosis/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "symptoms": ["fever", "cough", "fatigue"],
    "duration_days": 3,
    "severity": "moderate"
  }'
```

## Example Response

```json
{
  "success": true,
  "data": {
    "primary_diagnosis": "Common Cold",
    "confidence": 85,
    "differential_diagnoses": [
      {
        "disease": "Influenza",
        "confidence": 72,
        "specialist": "General Physician"
      }
    ],
    "specialist_recommendation": "General Physician",
    "record_id": "uuid"
  },
  "timestamp": "2026-05-19T10:30:00Z"
}
```

## Links

- **Full API Docs:** [API.md](./API.md)
- **Integration Guide:** [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
- **OpenAPI Spec:** [openapi.json](./openapi.json)
- **REST Client File:** [health-check.http](./health-check.http)
- **TypeScript Types:** [frontend/generated/api-types.ts](../../frontend/generated/api-types.ts)

## Support

- **Email:** api-support@healthcaresystem.com
- **GitHub:** https://github.com/healthcaresystem/api
- **Status:** https://status.healthcaresystem.com
