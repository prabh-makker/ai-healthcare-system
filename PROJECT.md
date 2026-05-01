# AI Healthcare — Quick Reference

## What
Clinical AI diagnosis platform. Symptom checker, chest X-ray analysis, triage, patient/doctor dashboards.

## URLs
| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8001 |
| API Docs | http://localhost:8001/docs |

## Dev Credentials (local only)
| Field | Value |
|-------|-------|
| DB name | `healthcare` |
| DB user | `healthcare_user` |
| DB pass | `healthcare_secure_password` |
| JWT secret | `change-this-to-a-real-secret-key` |

## Stack
- Frontend: `Next.js` + React 19 + TypeScript + Tailwind 4
- Backend: `FastAPI` + PostgreSQL 16 + Redis 7
- ML: XGBoost (symptoms) · ResNet50/TF (X-ray) · BERT (reports)
- Auth: JWT (8-day expiry default)

## Key Files
```
frontend/src/app/          — pages (login, register, dashboard)
frontend/src/lib/api.ts    — HTTP client
frontend/src/context/AuthContext.tsx — auth state

backend/app/main.py        — FastAPI entry + middleware
backend/app/api/v1/endpoints/
  auth.py / diagnosis.py / health.py / records.py
backend/app/core/config.py — all env vars

ml-models/symptom_analysis/ — XGBoost model + training
```

## Start (Docker)
```bash
docker-compose up
```

## Env Vars to Set
```
SECRET_KEY=<strong-secret>
POSTGRES_PASSWORD=<strong-pass>
NEXT_PUBLIC_API_URL=http://localhost:8001
```
