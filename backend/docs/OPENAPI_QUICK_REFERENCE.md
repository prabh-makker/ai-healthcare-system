# OpenAPI Specification - Quick Reference Guide

**AI Healthcare Diagnosis System API**
Location: `/backend/docs/openapi.json`
Status: Valid OpenAPI 3.1.0 | Production Ready

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Total Endpoints | 59 |
| Resource Tags | 11 |
| Schemas Defined | 31 |
| Security Coverage | 88.1% (52/59) |
| Healthcare Data Marked | 42.4% (25/59) |
| Documentation Coverage | 72.9% (43/59) |

---

## Endpoint Categories

### Medical Diagnosis & Analysis (4 endpoints)
```
POST /api/v1/diagnosis/symptoms      - AI symptom analysis
POST /api/v1/diagnosis/chat          - Interactive diagnosis chat
POST /api/v1/diagnosis/xray          - X-ray image analysis
POST /api/v1/diagnosis/report        - Medical report analysis
```
**Status**: 4/4 marked with x-healthcare-data ✓

### Medical Records Management (9 endpoints)
```
GET  /api/v1/records                 - List patient records
POST /api/v1/records/                - Create new record
GET  /api/v1/records/{record_id}     - Get specific record
PATCH /api/v1/records/{record_id}    - Update record status
DELETE /api/v1/records/{record_id}   - Delete record
POST /api/v1/records/bulk-approve    - Bulk approve records (doctor)
GET  /api/v1/records/pending/list    - List pending approval records
GET  /api/v1/records/stats/summary   - Get statistics
POST /api/v1/records/test-simple     - Test endpoint
```
**Status**: 8/9 marked with x-healthcare-data ✓

### Prescription Management (8 endpoints)
```
POST /api/v1/prescriptions/                        - Create prescription
GET  /api/v1/prescriptions/                        - List prescriptions
GET  /api/v1/prescriptions/{prescription_id}       - Get prescription
PATCH /api/v1/prescriptions/{prescription_id}      - Update prescription
DELETE /api/v1/prescriptions/{prescription_id}     - Delete prescription
POST /api/v1/prescriptions/{id}/log                - Log medication intake
GET  /api/v1/prescriptions/{id}/logs               - Get medication logs
GET  /api/v1/prescriptions/adherence/summary       - Get adherence data
```
**Status**: 8/8 marked with x-healthcare-data ✓

### Patient Management (7 endpoints)
```
GET  /api/v1/patients/me                           - Get my profile
POST /api/v1/patients/me                           - Update my profile
GET  /api/v1/patients/list                         - List all patients (admin)
GET  /api/v1/patients/my-patients                  - List my patients (doctor)
POST /api/v1/patients/assign/{id}/{doctor_id}     - Assign patient (admin)
GET  /api/v1/patients/admin/doctors-overview       - Workload overview (admin)
GET  /api/v1/patients/admin/all-users              - User list (admin)
```
**Status**: 5/7 marked with x-healthcare-data ✓

### Appointments (4 endpoints)
```
GET  /api/v1/appointments/           - List appointments
POST /api/v1/appointments/           - Create appointment
PUT  /api/v1/appointments/{appt_id}  - Update appointment
DELETE /api/v1/appointments/{appt_id} - Cancel appointment
```

### Notifications (5 endpoints)
```
GET  /api/v1/notifications/              - List notifications
GET  /api/v1/notifications/unread-count  - Get unread count
PATCH /api/v1/notifications/{id}/read    - Mark as read
PATCH /api/v1/notifications/mark-all-read - Mark all as read
DELETE /api/v1/notifications/{id}        - Delete notification
```

### Messages (3 endpoints)
```
POST /api/v1/messages/                  - Send message
GET  /api/v1/messages/conversations     - List conversations
GET  /api/v1/messages/{user_id}         - Get conversation
```

### Authentication (5 endpoints)
```
POST /api/v1/auth/register           - Register user
POST /api/v1/auth/login              - Login (returns JWT)
POST /api/v1/auth/logout             - Logout
GET  /api/v1/auth/me                 - Get current user
POST /api/v1/auth/change-password    - Change password
```

### Admin Operations (11 endpoints)
```
PATCH /api/v1/admin/users/{id}/status           - Update user status
PATCH /api/v1/admin/users/{id}/role             - Update user role
DELETE /api/v1/admin/users/{id}                 - Delete user
GET  /api/v1/admin/audit-log                   - View audit log
GET  /api/v1/admin/doctor-performance          - Doctor metrics
POST /api/v1/admin/bulk-assign-patients        - Bulk assign
GET  /api/v1/admin/system-health               - System health
GET  /api/v1/admin/diagnoses-distribution      - Diagnosis stats
GET  /api/v1/admin/export/users                - Export users
GET  /api/v1/admin/export/records              - Export records
GET  /api/v1/admin/export/appointments         - Export appointments
```

### System (3 endpoints)
```
GET / - Root endpoint
GET /api/v1/health - Health check
GET /metrics - Prometheus metrics
```

---

## Security

### Authentication Scheme
- **Type**: OAuth2
- **Grant Type**: password
- **Token Endpoint**: POST `/api/v1/auth/login`
- **Token Format**: JWT Bearer

### Required Authorization Header
```
Authorization: Bearer <jwt_token>
```

### Public Endpoints (No Auth Required)
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- GET `/api/v1/health`
- GET `/metrics`
- GET `/`

### Role-Based Access

**ADMIN Role**:
- All endpoints except patient-specific data
- User management, system configuration
- Export and audit functions

**DOCTOR Role**:
- View and manage assigned patients
- Create and manage prescriptions
- Approve medical records
- View patient medical history

**PATIENT Role**:
- View own profile and records
- View own prescriptions
- Log medication intake
- Send messages to assigned doctor

---

## Healthcare Data Security

### x-healthcare-data Extension

**Purpose**: Marks endpoints handling Protected Health Information (PHI)

**Marked Endpoints** (25/59 - 42.4%):

**Diagnosis**:
- ✓ POST /api/v1/diagnosis/symptoms
- ✓ POST /api/v1/diagnosis/chat
- ✓ POST /api/v1/diagnosis/xray
- ✓ POST /api/v1/diagnosis/report

**Records**:
- ✓ GET /api/v1/records
- ✓ POST /api/v1/records/
- ✓ GET /api/v1/records/{record_id}
- ✓ PATCH /api/v1/records/{record_id}
- ✓ DELETE /api/v1/records/{record_id}
- ✓ POST /api/v1/records/bulk-approve
- ✓ GET /api/v1/records/pending/list
- ✓ GET /api/v1/records/stats/summary

**Prescriptions**:
- ✓ POST /api/v1/prescriptions/
- ✓ GET /api/v1/prescriptions/
- ✓ GET /api/v1/prescriptions/{prescription_id}
- ✓ PATCH /api/v1/prescriptions/{prescription_id}
- ✓ DELETE /api/v1/prescriptions/{prescription_id}
- ✓ POST /api/v1/prescriptions/{id}/log
- ✓ GET /api/v1/prescriptions/{id}/logs
- ✓ GET /api/v1/prescriptions/adherence/summary

**Patients**:
- ✓ GET /api/v1/patients/me
- ✓ POST /api/v1/patients/me
- ✓ GET /api/v1/patients/list
- ✓ GET /api/v1/patients/my-patients
- ✓ POST /api/v1/patients/assign/{patient_id}/{doctor_id}

---

## Common Request/Response Patterns

### Pagination
**Query Parameters**:
```
skip=0    // Number of records to skip (default: 0)
limit=50  // Number of records to return (default: 50)
```

**Example**:
```
GET /api/v1/records?skip=10&limit=20
```

### Diagnosis Request
```json
{
  "symptoms": ["cough", "fever", "sore throat"],
  "save_record": true
}
```

### Diagnosis Response
```json
{
  "predicted_disease": "Common Cold",
  "confidence": 0.92,
  "recommended_specialist": "General Practitioner",
  "recognized_symptoms": ["cough", "fever", "sore throat"],
  "unknown_symptoms": []
}
```

### Prescription Request
```json
{
  "patient_id": "patient-123",
  "medication_name": "Ibuprofen",
  "dosage": "200mg",
  "frequency": "Every 6 hours",
  "instructions": "Take with food",
  "start_date": "2026-05-16",
  "end_date": "2026-05-25"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "status_code": 422
  },
  "data": null,
  "timestamp": "2026-05-16T10:30:00Z"
}
```

---

## Common HTTP Status Codes

| Code | Meaning | Common For |
|------|---------|-----------|
| 200 | OK | GET, POST, PUT, PATCH |
| 201 | Created | POST (resource creation) |
| 204 | No Content | DELETE, successful POST with no response |
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation error |
| 500 | Server Error | Unexpected error |

---

## Important Schemas

### PredictionResponse (Diagnosis Results)
```json
{
  "predicted_disease": "string",
  "confidence": 0.0,
  "recommended_specialist": "string",
  "recognized_symptoms": ["string"],
  "unknown_symptoms": ["string"],
  "record_id": "string or null"
}
```

### PrescriptionOut (Prescription Details)
```json
{
  "id": "string",
  "patient_id": "string",
  "doctor_id": "string",
  "medication_name": "string",
  "dosage": "string",
  "frequency": "string",
  "instructions": "string",
  "start_date": "2026-05-16T10:30:00Z",
  "end_date": "2026-05-25T10:30:00Z",
  "status": "active|inactive",
  "created_at": "2026-05-16T10:30:00Z",
  "updated_at": "2026-05-16T10:30:00Z"
}
```

### UserOut (User Profile)
```json
{
  "id": "string",
  "email": "user@example.com",
  "role": "PATIENT|DOCTOR|ADMIN",
  "is_active": true,
  "created_at": "2026-05-16T10:30:00Z"
}
```

---

## Testing the API

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

### Register User
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password",
    "role": "PATIENT"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=secure_password"
```

### Use JWT Token
```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

### Submit Symptoms for Diagnosis
```bash
curl -X POST http://localhost:8000/api/v1/diagnosis/symptoms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": ["cough", "fever"],
    "save_record": true
  }'
```

---

## Documentation Resources

- **Full Validation Report**: See `API_VALIDATION_REPORT.md`
- **Swagger UI**: `GET /docs` (development only)
- **ReDoc**: `GET /redoc` (development only)
- **OpenAPI Spec**: `GET /api/v1/openapi.json`

---

## Known Issues & Recommendations

### Issue #1: Empty Response Schemas (29 endpoints)
**Impact**: Code generation breaks
**Status**: Documented in validation report
**Fix**: Define explicit response schemas

### Issue #2: Missing Parameter Descriptions
**Impact**: Poor developer experience
**Status**: Documented in validation report
**Fix**: Add descriptions to all query parameters

### Issue #3: No Request/Response Examples
**Impact**: Cannot auto-generate SDKs
**Status**: Documented in validation report
**Fix**: Add examples to all endpoints

---

## API Version & Stability

**Current Version**: 0.1.0
**OpenAPI Version**: 3.1.0
**Status**: Beta - Subject to breaking changes
**Stability**: Stable for core diagnosis and records endpoints

### Deprecation Policy
- APIs will be deprecated with 2 weeks notice
- Deprecated endpoints marked with `deprecated: true`
- Support timeline: min 1 month after deprecation notice

---

## Support & Feedback

For API documentation issues or improvements:
1. Check the full validation report
2. Review the OpenAPI specification at `/docs/openapi.json`
3. Contact the development team

---

**Last Updated**: 2026-05-16
**Maintenance**: Ongoing
**Contact**: Healthcare System Team
