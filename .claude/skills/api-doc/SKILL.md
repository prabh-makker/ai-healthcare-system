---
name: api-doc
description: Generate OpenAPI 3.1.0 spec from FastAPI routes, validate Pydantic schemas, output Swagger UI JSON and TypeScript client types
disable-model-invocation: false
context: fork
---

# API Documentation Skill

## Purpose

Generate complete, production-ready OpenAPI specification from your FastAPI codebase. Output includes:
- `openapi.json` (Swagger/Redoc spec for API consumers)
- `API.md` (human-readable endpoint reference)
- `api-types.ts` (TypeScript types for frontend)

## Usage

```
/api-doc [scope]
```

**Scopes:**
- `routes` — All FastAPI route handlers
- `schemas` — Pydantic request/response models
- `auth` — Authentication flows (JWT, cookies)
- `ml` — ML model endpoints (diagnosis, predictions)
- `all` — Everything (default)

## Examples

```
/api-doc all
→ Generates complete spec

/api-doc auth
→ Documents JWT flow, role-based access, protected routes

/api-doc ml
→ XGBoost diagnosis endpoint with confidence scores
```

## Output Files

```
backend/docs/
├── openapi.json          (Swagger 3.1.0 spec)
├── API.md                (Markdown reference)
└── health-check.http     (REST Client file for testing)

frontend/generated/
├── api-types.ts          (TypeScript types from schemas)
└── api-client.ts         (Fetch wrapper with types)
```

## Features

- ✅ Parses FastAPI route docstrings as operation summaries
- ✅ Maps Pydantic models to OpenAPI schemas
- ✅ Documents JWT auth + httpOnly cookie flow
- ✅ Marks endpoints by role requirement (PATIENT, DOCTOR, ADMIN)
- ✅ Includes error responses (400, 401, 403, 404, 500)
- ✅ Generates TypeScript types for frontend consumption
- ✅ Works with Swagger UI, ReDoc, Postman imports

## Integration

**View live Swagger UI:**
```bash
cd backend
python -m app.main  # or: uvicorn app.main:app --reload
# Then: http://localhost:8000/docs
```

**Import into Postman:**
1. Get → Postman → Import
2. Paste URL: `http://localhost:8000/openapi.json`

**Generate frontend client:**
```bash
npx openapi-generator-cli generate \
  -i backend/docs/openapi.json \
  -g typescript-fetch \
  -o frontend/generated
```

## Notes

- Docstrings in route handlers become operation summaries
- Pydantic `Field(description=...)` becomes parameter docs
- Status codes inferred from HTTPException handlers
- Medical data (PHI) marked with `x-healthcare-data: true`
