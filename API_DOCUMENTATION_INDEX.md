# AI Healthcare API Documentation Index

## Quick Start

### 1. View Live API Docs (When Backend Running)
```bash
cd backend
python -m app.main
# Then open: http://localhost:8000/docs
```

### 2. Review API Reference
- **File**: `backend/docs/API.md` (708 lines, comprehensive)
- Complete endpoint documentation with examples
- Authentication flows, error codes, pagination, rate limits

### 3. Use TypeScript Types in Frontend
- **File**: `frontend/generated/api-types.ts` (622 lines, fully typed)
- Copy to your React project for type safety
- Includes APIClient class for all endpoints

### 4. Import into Postman
- URL: `http://localhost:8000/api/v1/openapi.json`
- Postman → Import → Link → Paste URL
- Auto-generates collection with all endpoints

### 5. Test with HTTP Client (VS Code)
- **File**: `backend/docs/health-check.http`
- Install: REST Client extension
- Open file and click "Send Request" above any request

---

## Generated Files

### OpenAPI Specification
**Location**: `backend/docs/openapi.json` (94 KB)
- **Format**: OpenAPI 3.1.0 (JSON)
- **Endpoints**: 51 documented
- **Schemas**: 31 data models
- **Security**: JWT + OAuth2
- **Auto-generated** from FastAPI app introspection

### API Reference Guide  
**Location**: `backend/docs/API.md` (20 KB)
- **Audience**: Developers, API consumers
- **Sections**: Architecture, auth, endpoints, errors, rate limits, testing
- **Examples**: curl, Python requests, Postman
- **Format**: Markdown (human-readable)

### TypeScript Types & Client
**Location**: `frontend/generated/api-types.ts` (18 KB)
- **Enums**: UserRole, RecordStatus, AppointmentStatus, PrescriptionStatus
- **Interfaces**: All request/response models
- **APIClient**: Fetch-based HTTP client with methods
- **Type-safe**: Full TypeScript support, no `any` types

### HTTP Testing File
**Location**: `backend/docs/health-check.http` (1.3 KB)
- **Format**: REST Client (VS Code extension)
- **Requests**: Register, login, profile, diagnosis, appointments, etc.
- **Usage**: Click "Send Request" to test endpoints live

### Generation Summary
**Location**: `backend/docs/GENERATION_SUMMARY.md` (3 KB)
- Overview of all generated files
- Integration instructions
- Statistics and metrics
- Regeneration instructions

---

## API Overview

### Endpoint Groups (51 Total)

| Group | Count | Key Operations |
|-------|-------|-----------------|
| **Auth** | 5 | Register, login, logout, get user, change password |
| **Patients** | 7 | Profile CRUD, list patients, doctor-patient links |
| **Records** | 9 | Medical records CRUD, stats, bulk operations |
| **Diagnosis** | 4 | Analyze symptoms, history, validation, templates |
| **Appointments** | 4 | List, create, update, cancel appointments |
| **Prescriptions** | 8 | CRUD, status updates, lifecycle management |
| **Notifications** | 5 | List, mark read, delete, subscriptions |
| **Messages** | 3 | Conversations, send, retrieve threads |
| **Admin** | 11 | User mgmt, audit logs, exports, metrics, health |
| **Health** | 1 | System health check |

### Authentication Methods

1. **JWT Bearer Token**
   - Header: `Authorization: Bearer <token>`
   - Lifetime: 24 hours (configurable)
   - Used by: API clients, scripts, mobile apps

2. **httpOnly Cookie**
   - Cookie: `access_token_cookie=<token>`
   - Sent automatically by browser
   - Used by: Web frontend (no JavaScript access)

### Roles & Permissions

| Role | Access |
|------|--------|
| **PATIENT** | Own profile, records, appointments; view assigned doctor |
| **DOCTOR** | Assigned patients, write records/diagnoses, manage appointments |
| **ADMIN** | All endpoints, user management, audit logs, system config |

### Key Features

**AI Diagnosis**
- XGBoost model: 80+ disease classification
- Confidence scores: 0-100%
- Specialist recommendations
- Ollama integration: Natural language responses

**Healthcare Data Protection**
- Role-based access control (RBAC)
- Medical data (PHI) marked in API spec
- Audit logging for compliance
- Security headers in responses

**Production Ready**
- Rate limiting: Per-endpoint configurable
- Pagination: skip/limit for large datasets
- Error handling: Detailed validation errors
- Structured logging: JSON, Sentry, Prometheus

---

## Usage Examples

### 1. Register User (curl)
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "SecurePass123!",
    "role": "PATIENT"
  }'
```

### 2. Login & Get Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=patient@example.com&password=SecurePass123!"

# Response:
# {"success": true, "data": {"access_token": "...", "token_type": "bearer"}}
```

### 3. Use Token in Request
```bash
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

### 4. Analyze Symptoms (AI Diagnosis)
```bash
curl -X POST http://localhost:8000/api/v1/diagnosis/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": ["headache", "fever", "cough"],
    "duration_days": 3,
    "severity": 5
  }'
```

### 5. React Component with Types
```typescript
import { diagnosisAPI, DiagnosisResponse } from './generated/api-types';

export function DiagnosisForm() {
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse>();

  const handleAnalyze = async (symptoms: string[]) => {
    try {
      // Fully typed - TypeScript catches errors at compile time
      const response = await diagnosisAPI.analyze({
        symptoms,
        duration_days: 3,
        severity: 5
      });
      setDiagnosis(response.data);
    } catch (error) {
      console.error('Diagnosis failed:', error);
    }
  };

  return (
    <div>
      {/* Diagnosis is properly typed */}
      <p>Diagnosis: {diagnosis?.primary_diagnosis}</p>
      <p>Confidence: {diagnosis?.confidence_score}%</p>
    </div>
  );
}
```

---

## Important Endpoints

### Health Check
```
GET /api/v1/health
```
Returns system status (database, cache, ML model)

### Metrics (Prometheus)
```
GET /metrics
```
Prometheus-format metrics (only accessible internally in prod)

### API Spec
```
GET /api/v1/openapi.json
```
Download OpenAPI specification for integration

---

## Rate Limiting

| Endpoint | Window | Limit |
|----------|--------|-------|
| `/auth/login` | 1 minute | 5 attempts |
| `/auth/register` | 1 minute | 3 attempts |
| `/diagnosis/analyze` | 1 hour | 10 requests |
| `/auth/change-password` | 1 minute | 3 attempts |
| Other endpoints | 1 minute | 100 requests |

**Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1684594800
Retry-After: 30  (on 429 Too Many Requests)
```

---

## Error Responses

### 200 Success
```json
{
  "success": true,
  "data": { "id": "...", "email": "..." },
  "timestamp": "2026-05-19T15:30:00Z"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Invalid email format",
    "status_code": 400
  },
  "data": null,
  "timestamp": "2026-05-19T15:30:00Z"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Not authenticated",
    "status_code": 401
  },
  "data": null,
  "timestamp": "2026-05-19T15:30:00Z"
}
```

### 422 Validation Error
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
      }
    ]
  },
  "data": null,
  "timestamp": "2026-05-19T15:30:00Z"
}
```

---

## Regenerating Documentation

If API changes, regenerate all docs:

```bash
cd C:/Users/khalo/ai\ healthcare
python generate_api_docs.py
```

This will:
1. Introspect FastAPI app and extract all routes
2. Build OpenAPI 3.1.0 spec from FastAPI definitions
3. Generate comprehensive Markdown reference
4. Create TypeScript interfaces and APIClient
5. Update all output files

---

## File Locations (Complete)

### Documentation
- `backend/docs/API.md` — Human-readable API reference
- `backend/docs/API_INTEGRATION_GUIDE.md` — Integration guide (existing)
- `backend/docs/GENERATION_SUMMARY.md` — This generation's details
- `backend/docs/openapi.json` — OpenAPI 3.1.0 spec
- `backend/docs/health-check.http` — REST Client test file

### Frontend
- `frontend/generated/api-types.ts` — TypeScript types & client

### Generation Script
- `generate_api_docs.py` — Python script to regenerate all docs

---

## Next Steps

1. **Start Backend**
   ```bash
   cd backend
   python -m app.main
   ```

2. **Test in Browser**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

3. **Import to Postman**
   - File → Import → Link
   - URL: http://localhost:8000/api/v1/openapi.json

4. **Copy TypeScript Types**
   ```bash
   cp frontend/generated/api-types.ts frontend/src/generated/
   ```

5. **Use in React**
   ```typescript
   import { authAPI, PatientAPI } from './generated/api-types';
   // Full type safety for all API calls
   ```

6. **Review API.md**
   - Open `backend/docs/API.md` in your editor
   - 708 lines of comprehensive endpoint documentation

---

## Support

- **API Spec Questions**: Review `backend/docs/API.md`
- **TypeScript Integration**: Check `frontend/generated/api-types.ts`
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **OpenAPI Spec**: https://spec.openapis.org/oas/v3.1.0
- **Project Issues**: GitHub issues in this repository

---

**Generated**: 2026-05-19
**Framework**: FastAPI 0.104+
**Spec Version**: OpenAPI 3.1.0
**TypeScript**: 4.5+
