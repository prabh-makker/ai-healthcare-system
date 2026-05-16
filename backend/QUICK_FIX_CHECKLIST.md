# Quick Fix Checklist - Test Coverage Gaps

## Files to Create/Modify

### 1. CREATE: tests/test_authorization.py (NEW FILE)
**~200 lines | 3 test classes | 19 test methods**

```python
import pytest
from app.models.models import User, MedicalRecord, UserRole
from app.core.authorization import (
    check_record_ownership,
    check_record_modification,
    check_record_deletion,
)
from tests.conftest import create_test_user

class TestCheckRecordOwnership:
    # 6 test methods covering all access scenarios
    
class TestCheckRecordModification:
    # 5 test methods covering role-based rejections
    
class TestCheckRecordDeletion:
    # 8 test methods covering role/status matrix
```

**Test Cases Needed:**

#### TestCheckRecordOwnership (6 tests)
- [ ] test_admin_can_access_any_record
- [ ] test_patient_can_access_own_record
- [ ] test_patient_cannot_access_other_record
- [ ] test_doctor_can_access_assigned_record
- [ ] test_doctor_cannot_access_unassigned_record
- [ ] test_doctor_cannot_access_when_no_doctor_id

#### TestCheckRecordModification (5 tests)
- [ ] test_admin_can_modify_any_record
- [ ] test_patient_can_modify_own_record
- [ ] test_patient_cannot_modify_other_record
- [ ] test_doctor_cannot_modify_unassigned_record
- [ ] test_invalid_role_cannot_modify

#### TestCheckRecordDeletion (8 tests)
- [ ] test_admin_can_delete_pending
- [ ] test_admin_can_delete_approved
- [ ] test_admin_can_delete_completed
- [ ] test_patient_can_delete_own_pending
- [ ] test_patient_cannot_delete_other_pending
- [ ] test_patient_cannot_delete_own_approved
- [ ] test_doctor_can_delete_assigned_pending
- [ ] test_doctor_cannot_delete_unassigned_pending
- [ ] test_doctor_cannot_delete_assigned_approved

**Estimated Time:** 2-3 hours

---

### 2. MODIFY: tests/test_auth.py
**Add 7 new test methods (~100 lines)**

#### TestAuthExceptionHandling (NEW CLASS)
- [ ] test_register_database_error (mocks db.commit failure)
- [ ] test_register_database_rollback (mocks db.rollback)
- [ ] test_login_audit_log_failure (mocks log_action exception)

#### TestRateLimitConfiguration (NEW CLASS - requires env setup)
- [ ] test_rate_limit_enforcement_when_enabled
- [ ] test_rate_limit_per_email_isolation
- [ ] test_rate_limit_resets_after_success

**Prerequisites:**
- Add `pytest-env` or use `monkeypatch` for RATE_LIMIT_ENABLED
- Create helper: mock auth_rate_limiter.is_allowed()

**Estimated Time:** 2 hours

---

### 3. MODIFY: tests/test_records.py
**Add 5 new test methods to TestDeleteRecord class (~80 lines)**

#### TestDeleteRecord (ADD TO EXISTING CLASS)
- [ ] test_delete_record_patient_can_delete_own_pending
- [ ] test_delete_record_patient_cannot_delete_approved
- [ ] test_delete_record_admin_can_delete_any_status
- [ ] test_delete_record_doctor_can_delete_assigned_pending
- [ ] test_delete_record_doctor_cannot_delete_unassigned

**Integration with existing tests:**
- Use existing helpers: create_test_user(), login_user(), create_record_in_db()
- Add status parameter to create_record_in_db if not present

**Estimated Time:** 1.5 hours

---

### 4. UPDATE: tests/conftest.py (IF NEEDED)
**~20 lines**

```python
# ADD if not present:

def create_record_in_db(db, patient_id, doctor_id=None, status="pending"):
    """Create test medical record"""
    record = MedicalRecord(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        doctor_id=doctor_id,
        symptoms=["test"],
        status=status,
    )
    db.add(record)
    db.commit()
    return record
```

**Estimated Time:** 0.5 hours

---

## Execution Plan

### Week 1 (CRITICAL)
**6 hours | 22 tests**

- [ ] Create tests/test_authorization.py (ALL 19 tests)
- [ ] Add TestAuthExceptionHandling to test_auth.py (3 tests)

**Expected Coverage Gain:**
- authorization.py: 54% → 90%+
- auth.py: 88% → 93%+

### Week 2 (HIGH)
**5 hours | 10 tests**

- [ ] Add TestRateLimitConfiguration to test_auth.py (3 tests)
- [ ] Add tests to TestDeleteRecord in test_records.py (5 tests)
- [ ] Update conftest.py if needed (1 test)

**Expected Coverage Gain:**
- auth.py: 93% → 96%+
- records.py: 89% → 94%+

### Pre-Release (MEDIUM)
**1.5 hours | 2 tests**

- [ ] Add limiter initialization tests (2 tests)

**Expected Final Coverage:**
- authorization.py: 95%+
- auth.py: 97%+
- records.py: 95%+

---

## Code Templates

### Template 1: Unit Test (authorization.py)

```python
def test_patient_cannot_modify_other_record(self, db):
    """Test authorization boundary: patient isolation"""
    # Setup
    patient1 = create_test_user(db, "p1@example.com", "Test@1234", "PATIENT")
    patient2 = create_test_user(db, "p2@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(
        id=str(uuid.uuid4()),
        patient_id=patient1.id,
        symptoms=["test"],
    )
    db.add(record)
    db.commit()
    
    # Execute
    allowed, msg = check_record_modification(record, patient2)
    
    # Assert
    assert allowed is False
    assert msg == "Forbidden"
```

### Template 2: Integration Test (records.py)

```python
def test_delete_record_admin_can_delete_approved(self, client, db):
    """Integration test: admin deletion bypass"""
    # Setup
    admin = create_test_user(db, "admin@example.com", "Test@1234", "ADMIN")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        status="approved",
    )
    db.add(record)
    db.commit()
    
    # Login
    login_user(client, "admin@example.com", "Test@1234")
    
    # Execute
    resp = client.delete(f"/api/v1/records/{record.id}")
    
    # Assert
    assert resp.status_code == 204
```

### Template 3: Exception Test (auth.py)

```python
def test_register_database_error(self, client, db, mocker):
    """Test resilience: registration handles DB errors"""
    # Mock database failure
    mocker.patch.object(
        db.__class__,
        "commit",
        side_effect=Exception("Database connection lost"),
    )
    
    # Execute
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "Test@1234",
        "role": "PATIENT",
    })
    
    # Assert
    assert resp.status_code == 500
    assert "Error creating user" in resp.json()["detail"]
```

---

## Verification Commands

```bash
# Run authorization tests only
pytest tests/test_authorization.py -v --cov=app.core.authorization

# Run all auth tests with coverage
pytest tests/test_auth.py tests/test_auth_advanced.py \
  --cov=app.api.v1.endpoints.auth \
  --cov=app.core.authorization \
  --cov-report=term-missing

# Run records tests with authorization coverage
pytest tests/test_records.py \
  --cov=app.core.authorization \
  --cov-report=term-missing

# Full coverage report
pytest tests/ \
  --cov=app.api.v1.endpoints.auth \
  --cov=app.core.authorization \
  --cov=app.api.v1.endpoints.records \
  --cov-report=html
```

---

## Acceptance Criteria

### Coverage Targets
- [ ] authorization.py ≥ 90%
- [ ] auth.py ≥ 95%
- [ ] records.py ≥ 95%

### Branch Coverage
- [ ] All if/elif/else branches in authorization functions tested
- [ ] All exception paths in auth endpoint tested
- [ ] All role/status combinations in deletion tested

### Security Verification
- [ ] Admin bypass tested for all functions
- [ ] Patient isolation verified (cannot access/modify/delete other's records)
- [ ] Doctor assignment verified
- [ ] Invalid role rejection tested

---

## Priority Rules

**MUST DO** (Blocking release):
1. All authorization.py functions (19 tests)
2. Auth exception paths (3 tests)

**SHOULD DO** (High priority):
1. Rate limiting enforcement (3 tests)
2. Records delete matrix (5 tests)

**NICE TO DO** (Before release):
1. Limiter initialization (2 tests)

---

**Total Implementation: ~14 hours | 34 new tests | +25% coverage gain**
