---
name: test-gap-analyzer
description: Identify untested code paths in auth and authorization, generate missing test cases
---

# Test Gap Analyzer Subagent

## Task

Find and fix test coverage gaps in critical security code:
- Authentication (registration, login, token refresh)
- Authorization (role-based access control)
- Record deletion rules (newly fixed vulnerability)

## Process

1. **Run Coverage Analysis**
   ```bash
   cd backend
   pytest --cov=app.api.v1.endpoints.auth \
           --cov=app.api.v1.endpoints.records \
           --cov=app.core.authorization \
           --cov=app.core.security \
           --cov-report=html
   ```

2. **Identify Gaps**
   - Find lines/branches with <80% coverage
   - Flag conditional paths not tested (if/elif/else)
   - Check exception handlers are tested
   - Verify all role combinations tested

3. **Generate Missing Tests**
   - Test fixtures for each user role
   - Test matrix for all status/role combos
   - Edge cases (invalid tokens, expired sessions)
   - Security boundary tests

4. **Validate**
   - Run new tests
   - Confirm coverage increases
   - Update `backend/tests/conftest.py` with new fixtures

## Critical Test Coverage Areas

### Authentication (`auth.py`)

**Must test:**
- ✅ Registration: valid email, invalid email, existing user, weak password
- ✅ Role allowlist: can't self-register as ADMIN
- ✅ Login: correct password, wrong password, inactive user
- ✅ Rate limiting: lockout after N failed attempts
- ✅ Token refresh: valid/expired/malformed tokens
- ✅ Cookie secure flags (httpOnly, SameSite=lax)

**Example gap:** Token refresh not tested with `is_active=False`

### Authorization (`authorization.py`)

**Must test:**
- ✅ `check_record_ownership()`: PATIENT, DOCTOR, ADMIN access
- ✅ `check_record_modification()`: who can edit what
- ✅ `check_record_deletion()`: new! ADMIN can delete all, others pending only
- ✅ Role-based filtering: query results match user role

**Example gap:** All role combinations for `check_record_deletion()`:
```
PATIENT + pending record (own)    → ✅ allowed
PATIENT + pending record (other)  → ✅ denied
PATIENT + approved record (own)   → ✅ denied
DOCTOR + pending record (assigned) → ✅ allowed
DOCTOR + pending record (unassigned) → ✅ denied
DOCTOR + approved record → ✅ denied
ADMIN + any record → ✅ allowed
```

### Records Endpoints (`records.py`)

**Must test:**
- ✅ `DELETE /{record_id}` with all role/status combos (matrix above)
- ✅ `GET /` filters by patient/doctor role
- ✅ `PUT /{record_id}` status updates (pending → approved, approved → ?)
- ✅ Bulk approve with admin only

## Generated Test Structure

```python
# backend/tests/test_authorization_matrix.py

import pytest
from app.models.models import UserRole

# Test data: (user_role, record_status, is_owner/assigned, expected_allowed)
DELETION_MATRIX = [
    (UserRole.PATIENT, "pending", True, True),      # own pending
    (UserRole.PATIENT, "pending", False, False),    # other's pending
    (UserRole.PATIENT, "approved", True, False),    # own approved
    (UserRole.DOCTOR, "pending", True, True),       # assigned pending
    (UserRole.DOCTOR, "pending", False, False),     # unassigned pending
    (UserRole.DOCTOR, "approved", True, False),     # assigned approved
    (UserRole.ADMIN, "pending", False, True),       # any pending
    (UserRole.ADMIN, "approved", False, True),      # any approved
    (UserRole.ADMIN, "completed", False, True),     # any completed
]

@pytest.mark.parametrize("role,status,is_owner,expected", DELETION_MATRIX)
async def test_record_deletion_matrix(
    role, status, is_owner, expected,
    client, db, create_user, create_record
):
    """Test all role/status combinations for record deletion."""
    # Setup
    user = create_user(role=role)
    record = create_record(
        status=status,
        patient_id=user.id if is_owner else uuid4(),
        doctor_id=user.id if (role == UserRole.DOCTOR and is_owner) else None
    )
    
    # Act
    response = await client.delete(
        f"/api/v1/records/{record.id}",
        headers={"Authorization": f"Bearer {user.token}"}
    )
    
    # Assert
    if expected:
        assert response.status_code == 204
    else:
        assert response.status_code == 403
```

## Coverage Targets

| Module | Current | Target | Gap |
|--------|---------|--------|-----|
| `auth.py` | 72% | 90% | +18% |
| `authorization.py` | 65% | 95% | +30% |
| `records.py` | 68% | 85% | +17% |
| **Overall** | **68%** | **85%** | **+17%** |

## Output

Generates:
- `backend/tests/test_authorization_matrix.py` (new comprehensive tests)
- `backend/tests/test_auth_edge_cases.py` (token/rate limit edge cases)
- Updated `backend/tests/conftest.py` (new fixtures)
- Coverage report: `htmlcov/index.html`

## When to Run

- After security fixes (like record deletion policy)
- Before releasing to production
- Monthly as regression check
- When onboarding new developers

## Success Criteria

✅ Auth coverage ≥ 90%
✅ Authorization coverage ≥ 95%
✅ All role/status combos tested
✅ All exception paths covered
✅ No untested conditional branches
