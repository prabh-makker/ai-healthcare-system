---
name: api-documenter
description: Parse FastAPI routes, validate Pydantic schemas, generate OpenAPI spec + Swagger UI + TypeScript types
---

# API Documenter Subagent

## Task

Automatically generate and maintain OpenAPI 3.1.0 specification from your FastAPI codebase.

## Process

1. **Scan Endpoints**
   - Walk `backend/app/api/v1/endpoints/` directory
   - Extract all `@router` decorated functions
   - Parse docstrings for operation summary/description
   - Map HTTP method + path + status codes

2. **Extract Schemas**
   - Identify all Pydantic models used in request/response
   - Map to OpenAPI components/schemas
   - Include Field descriptions
   - Handle optional/required fields

3. **Document Authentication**
   - JWT cookie flow (httpOnly, secure flags)
   - Role-based access control (PATIENT, DOCTOR, ADMIN)
   - Protected route markers

4. **Generate Outputs**
   - `backend/docs/openapi.json` (Swagger 3.1.0)
   - `backend/docs/API.md` (human-readable)
   - `frontend/generated/api-types.ts` (TypeScript)
   - `backend/docs/health-check.http` (REST Client tests)

5. **Validate**
   - Check all routes have descriptions
   - Verify response schemas match actual responses
   - Ensure auth flows documented
   - Test Swagger UI renders without errors

## Integration Points

- **FastAPI auto-docs**: Compare against `/docs` endpoint
- **Frontend client**: TypeScript types prevent mismatches
- **Postman/Insomnia**: Import openapi.json for testing
- **CI/CD**: Fail builds if spec is outdated

## Output Example

**OpenAPI JSON (openapi.json):**
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "AI Healthcare API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/v1/records": {
      "get": {
        "summary": "List medical records",
        "security": [{"bearerAuth": []}],
        "tags": ["Records"],
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "schema": { "enum": ["pending", "approved", "completed"] }
          }
        ],
        "responses": {
          "200": {
            "description": "OK",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/MedicalRecord" }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "MedicalRecord": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "status": { "enum": ["pending", "approved", "completed"] },
          "symptoms": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

**API Markdown (API.md):**
```markdown
# AI Healthcare API Reference

## Records

### List Records
`GET /api/v1/records`

List all medical records (paginated).

**Parameters:**
- `status` (query): Filter by status (pending|approved|completed)
- `skip` (query): Pagination offset (default: 0)
- `limit` (query): Pagination limit (default: 100)

**Response:**
```json
[
  {
    "id": "uuid",
    "status": "pending",
    "symptoms": ["headache", "fever"],
    "confidence_score": 0.85
  }
]
```

### Delete Record
`DELETE /api/v1/records/{record_id}`

Delete a medical record (pending only for non-admin).

**Permissions:** PATIENT (own record), DOCTOR (assigned), ADMIN (any)

**Status Codes:**
- 204: Deleted
- 403: Cannot delete non-pending records
- 404: Record not found
```

**TypeScript Types (api-types.ts):**
```typescript
export interface MedicalRecord {
  id: string;
  patient_id: string;
  status: 'pending' | 'approved' | 'completed';
  symptoms: string[];
  confidence_score?: number;
  created_at: string;
}

export interface CreateRecordRequest {
  symptoms: string[];
  notes?: string;
}
```

## When to Run

- After adding new endpoints
- Before cutting a release
- When Pydantic schemas change
- As part of CI/CD pipeline

## Success Criteria

✅ OpenAPI spec is valid (passes validator)
✅ All endpoints documented
✅ All schemas include examples
✅ Swagger UI renders without errors
✅ TypeScript types match backend schemas
✅ No circular references in components
