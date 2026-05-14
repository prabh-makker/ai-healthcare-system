---
name: gen-test
description: Generate jest or pytest tests for a given file. Args: file path relative to project root.
---

Generate comprehensive tests for the file: $ARGUMENTS

Rules:
- Detect language from file extension
- Frontend (.tsx/.ts): use Jest + React Testing Library. Mock `@/lib/api` with `jest.mock`. Test render, user interactions, loading states, error states.
- Backend (.py): use pytest + httpx AsyncClient (TestClient). Mock DB with pytest-mock. Test happy path, 400/401/422/500 responses, edge cases.
- Cover at minimum: happy path, missing/invalid input, auth failure (backend), empty state (frontend)
- Place test file adjacent to source: `Component.test.tsx` or `test_module.py`
- Import paths must match the project's tsconfig paths (`@/`) or Python module structure (`app.`)
- Do not mock internal business logic — only external boundaries (DB, HTTP, localStorage)

Project context:
- Frontend root: `frontend/src/`
- Backend root: `backend/app/`
- Auth: JWT in `localStorage.token` (frontend) / `Depends(get_current_user)` (backend)
- API client: `frontend/src/lib/api.ts` — mock this, not fetch directly
