# API Documentation

This directory contains the complete OpenAPI specification and documentation for the AI Healthcare API.

## Files

### openapi.json
**Swagger/OpenAPI 3.1.0 specification** — Machine-readable format for:
- API consumers building client libraries
- Integration with Swagger UI, ReDoc, Postman
- Code generation tools (openapi-generator)

**View with Swagger UI:**
```bash
cd backend
uvicorn app.main:app --reload
# Then open: http://localhost:8000/docs
```

**Import into Postman:**
1. Open Postman → File → Import
2. Paste: `http://localhost:8000/openapi.json` or select the local file
3. All endpoints and models auto-imported

### API.md
**Human-readable reference** — Organized by endpoint category:
- Summary and description of each endpoint
- Request parameters and body schemas
- Response codes and formats
- Data model documentation
- Authentication and security info

Perfect for:
- Reading while coding
- Understanding API behavior
- Client integration planning

### health-check.http
**REST client file** for VS Code REST Client extension or other HTTP clients
- Pre-built requests for common operations
- Replace `<access_token>` with real JWT from login response
- Use to test endpoints without writing code

**Required Extension:** Install "REST Client" (humao.rest-client) in VS Code

## Key Endpoints

### Authentication
- `POST /auth/register` — Create user account
- `POST /auth/login` — Login and get JWT token
- `POST /auth/logout` — Logout
- `POST /auth/change-password` — Change password
- `GET /auth/me` — Get current user profile

### Diagnosis
- `POST /diagnosis/symptoms` — Analyze symptoms with ML model
- `POST /diagnosis/chat` — Chat-based diagnosis assistant
- `POST /diagnosis/xray` — X-ray image analysis (stub)
- `POST /diagnosis/report` — Clinical report analysis (stub)

### Medical Records
- `GET /records` — List user's records
- `POST /records` — Create new record
- `GET /records/{id}` — Get specific record
- `PATCH /records/{id}` — Update record (doctor/admin)
- `DELETE /records/{id}` — Delete record
- `GET /records/pending/list` — Get pending approvals (doctor/admin)
- `POST /records/bulk-approve` — Bulk approve records

### Appointments
- `GET /appointments` — List appointments
- `POST /appointments` — Create appointment
- `PUT /appointments/{id}` — Update appointment
- `DELETE /appointments/{id}` — Cancel appointment

### Prescriptions
- `POST /prescriptions` — Create prescription (doctor only)
- `GET /prescriptions` — List prescriptions
- `GET /prescriptions/{id}` — Get specific prescription
- `PATCH /prescriptions/{id}` — Update prescription
- `DELETE /prescriptions/{id}` — Delete prescription
- `POST /prescriptions/{id}/log` — Log medication taken
- `GET /prescriptions/{id}/logs` — Get medication logs

### Messages
- `POST /messages` — Send message (doctor-patient only)
- `GET /messages/conversations` — List conversations
- `GET /messages/{user_id}` — Get message history

### Notifications
- `GET /notifications` — List notifications
- `GET /notifications/unread-count` — Get unread count
- `PATCH /notifications/{id}/read` — Mark as read

### Admin
- `PATCH /admin/users/{id}/status` — Activate/deactivate user
- `PATCH /admin/users/{id}/role` — Change user role
- `DELETE /admin/users/{id}` — Delete user
- `GET /admin/audit-log` — View audit log
- `GET /admin/doctor-performance` — Doctor performance metrics
- `GET /admin/system-health` — System health status
- `POST /admin/export-data` — Export all data as CSV

### Patients
- `GET /patients/me` — Get my patient profile
- `POST /patients/me` — Update my profile
- `GET /patients/list` — List all patients (doctor/admin)
- `GET /patients/my-patients` — Get my assigned patients (doctor)
- `POST /patients/assign/{patient_id}/{doctor_id}` — Assign patient to doctor (admin)

### Patient Admin Overview
- `GET /patients/admin/doctors-overview` — Doctor statistics and metrics
- `GET /patients/admin/all-users` — All users grouped by role

## Authentication

All endpoints (except registration/login) require JWT authentication. Two methods:

### 1. HTTP Cookie (Recommended for Web)
- Server sets `auth_token` httpOnly cookie on login
- Browser auto-includes in all requests
- Secure: httpOnly, SameSite=Lax, Secure in production

### 2. Authorization Header (For APIs/Tools)
```
Authorization: Bearer <access_token>
```
- Use when cookie not available (mobile, third-party clients)
- Token returned in login response body

## Role-Based Access

**PATIENT**
- View/create own medical records
- List/create appointments
- View own prescriptions
- Message assigned doctor
- View notifications

**DOCTOR**
- View assigned patients' records
- Create/update medical records for patients
- Create prescriptions for assigned patients
- Message patients
- View pending record approvals
- Create/manage appointments for patients
- Access doctor dashboard with performance metrics

**ADMIN**
- View all users and records
- Create/update/delete users
- Change user roles
- Approve/reject medical records
- Access audit logs
- View system metrics
- Export data

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status_code": 400
  },
  "data": null,
  "timestamp": "2026-05-16T12:22:18.123456"
}
```

**Common status codes:**
- `400` — Bad request (invalid input)
- `401` — Unauthorized (missing/invalid auth)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `409` — Conflict (e.g., duplicate email)
- `422` — Validation error (request body validation failed)
- `429` — Too many requests (rate limited)
- `500` — Server error

## Security Considerations

1. **HTTPS Required in Production** — All auth cookies marked Secure
2. **CORS Restricted** — Only configured origins allowed
3. **Rate Limiting** — Auth endpoints limited to prevent brute force
4. **Password Requirements** — Min 12 chars, uppercase, digit, special char
5. **Token Expiration** — JWT tokens expire after configured duration
6. **Audit Logging** — All actions logged with user ID and timestamp
7. **Medical Data** — PHI marked with `x-healthcare-data` in spec

## Code Generation

Generate client libraries from OpenAPI spec:

### TypeScript/JavaScript
```bash
npx openapi-generator-cli generate \
  -i docs/openapi.json \
  -g typescript-fetch \
  -o frontend/generated
```

### Python
```bash
pip install openapi-generator-cli
openapi-generator-cli generate \
  -i docs/openapi.json \
  -g python \
  -o backend/generated
```

### Go
```bash
openapi-generator-cli generate \
  -i docs/openapi.json \
  -g go \
  -o clients/go
```

## Support

- **Swagger UI:** http://localhost:8000/docs (dev only)
- **ReDoc:** http://localhost:8000/redoc (dev only)
- **OpenAPI Spec:** http://localhost:8000/api/v1/openapi.json
- **Health Check:** GET http://localhost:8000/api/v1/health
