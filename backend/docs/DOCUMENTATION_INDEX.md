# AI Healthcare API Documentation Index

**Version:** 1.0.0  
**Generated:** 2026-05-19  
**Location:** `/backend/docs/`

## 📚 Documentation Files

### Start Here

1. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** ⭐
   - 1-page cheat sheet
   - Common endpoints
   - Status codes
   - Example requests/responses
   - Best for: Quick lookups, copy-paste examples

### Comprehensive Guides

2. **[API.md](./API.md)**
   - Complete endpoint reference
   - Authentication details
   - Rate limiting & security headers
   - All 40+ endpoints documented
   - Best for: Full API understanding

3. **[API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)**
   - Integration step-by-step
   - Data models with TypeScript interfaces
   - Error handling patterns
   - Code examples in JavaScript/Python
   - WebSocket integration
   - FAQ section
   - Best for: Frontend developers integrating the API

### Technical References

4. **[openapi.json](./openapi.json)**
   - OpenAPI 3.1.0 specification
   - Machine-readable API definition
   - Use with Swagger UI, Postman, code generators
   - Best for: API tools, auto-generating clients

5. **[health-check.http](./health-check.http)**
   - REST Client format (works with VS Code REST Client extension)
   - All API endpoints with example requests
   - Variables for token substitution
   - Copy-paste ready
   - Best for: Manual API testing

### Generated Code

6. **[../frontend/generated/api-types.ts](../../frontend/generated/api-types.ts)**
   - TypeScript types for all API models
   - Auto-generated from OpenAPI spec
   - Ready to import in frontend
   - Type guards and utility functions
   - Best for: Frontend development

### Legacy/Reference

7. **[API_VALIDATION_REPORT.md](./API_VALIDATION_REPORT.md)**
   - Previous validation analysis
   - Good for historical reference

8. **[OPENAPI_QUICK_REFERENCE.md](./OPENAPI_QUICK_REFERENCE.md)**
   - Quick reference for OpenAPI spec
   - Legacy documentation

---

## 🚀 Quick Start by Role

### Frontend Developer

1. Read: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) (5 min)
2. Read: [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md) (15 min)
3. Use: `health-check.http` for testing endpoints
4. Import: `frontend/generated/api-types.ts` in your code

### Backend Developer

1. Review: [API.md](./API.md) for all endpoints
2. Check: [openapi.json](./openapi.json) for spec compliance
3. Use: Type definitions if extending frontend

### DevOps/API Consumer

1. Read: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
2. Use: [openapi.json](./openapi.json) for monitoring/logging
3. Reference: Rate limits and security headers sections

### System Integrator

1. Start: [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
2. Use: Code examples in JavaScript/Python
3. Test: `health-check.http` file

---

## 📋 API Organization

### Core Features Documented

#### Authentication
- Registration with password strength requirements
- Login with JWT tokens
- Password management
- Rate limiting on auth endpoints

#### Patient Management
- Profile creation and updates
- Chronic conditions tracking
- Emergency contact info
- Blood type recording

#### AI Diagnosis
- XGBoost symptom analysis
- Confidence scoring (0-100)
- Differential diagnoses
- Specialist recommendations
- Ollama integration for explanations

#### Medical Records
- Record creation and updates
- Doctor annotations
- Status tracking (pending/reviewed/archived)
- Comprehensive search and filtering

#### Appointments
- Scheduling
- Rescheduling
- Cancellation
- Status tracking

#### Prescriptions
- Drug prescriptions
- Dosage and frequency
- Duration tracking
- Status management

#### Communication
- Inter-user messaging
- Real-time notifications via WebSocket
- Appointment alerts
- Diagnosis notifications

#### Administration
- User management
- Audit logging
- System statistics
- Performance metrics

---

## 🔐 Security & Authentication

### Token Management
- JWT tokens in httpOnly cookies (recommended)
- Alternate: Authorization header
- 24-hour token expiration
- Automatic refresh via re-login

### Password Requirements
```
✓ 8+ characters
✓ Uppercase letter (A-Z)
✓ Lowercase letter (a-z)
✓ Number (0-9)
✓ Special character (!@#$%^&*)
```

Example: `SecurePass123!`

### Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth | 5 req | 1 min |
| Diagnosis | 10 req | 1 min |
| General | 100 req | 1 min |

### Security Headers
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000 (production)
```

---

## 🛠 Tools & Testing

### VS Code REST Client

Use `health-check.http` file:

```bash
# Install extension: REST Client (Huachao Mao)
# Open health-check.http
# Click "Send Request" on any endpoint
```

### Postman

```bash
# Import OpenAPI:
# File → Import → openapi.json
```

### cURL

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=SecurePass123!"
```

### Python

```python
import requests
client = requests.Session()
client.post('http://localhost:8000/api/v1/auth/login',
  data={'username': 'user@example.com', 'password': 'SecurePass123!'})
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:8000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=user@example.com&password=SecurePass123!',
  credentials: 'include',
});
```

---

## 📊 API Statistics

| Metric | Count |
|--------|-------|
| Total Endpoints | 40+ |
| Data Models | 15+ |
| Authentication Methods | 2 (Cookie, Header) |
| HTTP Methods | 5 (GET, POST, PATCH, PUT, DELETE) |
| Status Codes | 7 (200, 201, 204, 400, 401, 403, 404, 422, 429, 500) |
| Rate Limit Tiers | 3 |
| User Roles | 3 (PATIENT, DOCTOR, ADMIN) |

---

## 🔄 Response Format

All API responses follow this format:

```json
{
  "success": true|false,
  "data": {...},
  "error": {
    "message": "...",
    "status_code": 200|400|401|...,
    "details": {...}
  },
  "timestamp": "2026-05-19T10:30:00Z"
}
```

---

## 📱 WebSocket Integration

### Connect
```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/ws?token=<access_token>');
```

### Message Types
- `notification` - New notifications
- `message` - Private messages
- `appointment` - Appointment updates
- `diagnosis` - Diagnosis results
- `system` - System alerts

---

## 🚨 Common Error Codes

| Code | Scenario | Solution |
|------|----------|----------|
| 400 | Bad Request | Check request format, required fields |
| 401 | Not Authenticated | Login to get token |
| 403 | Not Authorized | Insufficient permissions (role check) |
| 404 | Not Found | Resource ID doesn't exist |
| 422 | Validation Error | Invalid field values |
| 429 | Rate Limited | Wait and retry |
| 500 | Server Error | Check server logs |

---

## 📞 Support & Resources

### Documentation
- **Full API Reference:** [API.md](./API.md)
- **Integration Guide:** [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
- **OpenAPI Spec:** [openapi.json](./openapi.json)

### Testing
- **REST Client File:** [health-check.http](./health-check.http)
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

### Code
- **TypeScript Types:** [frontend/generated/api-types.ts](../../frontend/generated/api-types.ts)
- **Backend:** [backend/app/api/v1/](../app/api/v1/)

### Contact
- **Email:** api-support@healthcaresystem.com
- **Issues:** https://github.com/healthcaresystem/api/issues
- **Status:** https://status.healthcaresystem.com

---

## 📝 Documentation Maintenance

- **Last Updated:** 2026-05-19
- **Version:** 1.0.0
- **OpenAPI Version:** 3.1.0
- **Generated From:** FastAPI backend
- **Tools:** OpenAPI Generator, TypeScript Type Generator

### Regenerating Documentation

To regenerate docs from source code:

```bash
cd backend
python generate_api_docs.py
```

This will update:
- `docs/openapi.json` - OpenAPI spec
- `docs/API.md` - Markdown reference
- `frontend/generated/api-types.ts` - TypeScript types

---

**Note:** These docs are auto-generated from the FastAPI application. Manual edits to `.md` files will be preserved, but OpenAPI spec regeneration requires running the generation script.
