# AI Healthcare — Quick Reference

## What
Clinical AI diagnosis platform. Symptom checker, chest X-ray analysis, triage, patient/doctor dashboards.

## URLs
| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Dev Credentials (local only)
| Field | Value |
|-------|-------|
| DB name | `healthcare` |
| DB user | `healthcare_user` |
| DB pass | `healthcare_secure_password` |
| JWT secret | `change-this-to-a-real-secret-key` |

## Stack
- Frontend: `Next.js` + React 19 + TypeScript + Tailwind 4 + Framer Motion
- Backend: `FastAPI` + PostgreSQL 16 + Redis 7
- ML: XGBoost (symptoms) · ResNet50/TF (X-ray) · BERT (reports)
- Auth: JWT stored in `localStorage.token` + `localStorage.user`

## Test Users
| Role    | Email                | Password   |
|---------|----------------------|------------|
| Patient | patient@example.com  | patient123 |
| Doctor  | doctor@example.com   | doctor123  |
| Admin   | admin@example.com    | admin123   |

Login: `POST /api/v1/auth/login` — form-urlencoded `username` + `password`

## Key Files
```
frontend/src/
  app/dashboard/
    layout.tsx           — Sidebar + ProtectedRoute
    page.tsx             — Main overview (role-aware: DOCTOR / PATIENT / ADMIN)
    admin/page.tsx       — ADMIN only
    patients/page.tsx    — DOCTOR only
    records/page.tsx     — Both roles
    appointments/page.tsx — PATIENT only
    search/page.tsx      — Both roles
    settings/page.tsx    — Both roles (Appearance/theme toggle here)
  app/globals.css        — CSS vars: --background, --foreground, --glass-bg etc.
  components/
    Sidebar.tsx          — Role-aware nav
    DashboardBg.tsx      — Shared 3D bg (particles, orbs, grid) — use on all pages
    ProtectedRoute.tsx   — Redirects unauthenticated / wrong role

backend/app/main.py      — FastAPI entry
backend/app/api/v1/      — Auth, diagnosis, records, health endpoints
backend/app/core/config.py — env vars

ml-models/symptom_analysis/ — XGBoost model
```

## Start (Docker)
```bash
cd "C:\Users\khalo\Ai healthcare"
docker-compose up --build
```

## Role-Based Access
| Role    | Sidebar pages                                        |
|---------|------------------------------------------------------|
| PATIENT | Overview, Diagnostics, My History, Appointments, Search, Settings |
| DOCTOR  | Overview, Diagnostics, Patients, Records, Search, Settings |
| ADMIN   | Overview, Diagnostics, Admin, Search, Settings       |

Wrong role visiting protected page → auto-redirect to `/dashboard`

## Theme System
- `ThemeContext` toggles `light`/`dark` class on wrapper div
- CSS vars in `globals.css` — NEVER use hardcoded Tailwind bg like `bg-[#050505]`
- Use `style={{ background: "var(--background)" }}` everywhere
- `glass-nav` CSS class = sidebar bg (theme-aware via `.light .glass-nav`)
- Settings page has Appearance toggle

## Common Gotchas
| Problem | Fix |
|---------|-----|
| Background effects invisible | Must be `absolute` (not `fixed`); layout bg must use CSS var not Tailwind hardcode |
| Light mode not applying | Remove inline style overrides on sidebar; use `glass-nav` class |
| Dynamic Tailwind classes missing | Use inline `style={{ background: "rgba(...)" }}` — dynamic strings get purged |
| Docker npm peer dep errors | Copy `node_modules` from builder stage in Dockerfile |

## Git
- Repo: `https://github.com/prabh-makker/ai-healthcare-system`
- Main branch = latest stable (all features merged)

## Env Vars to Set (production)
```
SECRET_KEY=<strong-secret>
POSTGRES_PASSWORD=<strong-pass>
NEXT_PUBLIC_API_URL=http://localhost:8000
```
