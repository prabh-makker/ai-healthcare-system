---
name: gen-test
description: Generate pytest + jest test suites for new API endpoints and React components with coverage tracking
disable-model-invocation: false
context: fork
---

# Generate Test Skill

## Purpose

Auto-generate comprehensive test suites for new FastAPI endpoints and React components. Includes:
- Unit tests (isolated functions)
- Integration tests (endpoint → database)
- E2E tests (full user flows)
- Coverage reports

## Usage

```
/gen-test [type] [path]
```

**Types:**
- `endpoint` — FastAPI route handler + DB interactions
- `component` — React component + props + hooks
- `auth` — Authentication flows (register, login, protected routes)
- `integration` — Multi-endpoint workflows
- `all` — All test types for a module

## Running Tests

```bash
# Run all tests
pytest -v

# Run specific test file
pytest tests/test_records.py -v

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

## Notes

- Tests use AsyncClient for FastAPI async endpoints
- Database fixtures auto-rollback after each test
- Mocks handle external APIs (Sentry, Redis, ML models)
- Component tests use React Testing Library
- Full role-based access control test matrix included
