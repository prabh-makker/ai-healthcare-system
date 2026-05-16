# Test Gap Analysis: Authentication & Authorization
**Generated:** 2026-05-16  
**Analysis Scope:** Backend auth/authorization modules with security focus

---

## Executive Summary

| Module | Coverage | Status | Risk Level |
|--------|----------|--------|------------|
| `auth.py` | 88% | GOOD | LOW |
| `authorization.py` | 54% | POOR | HIGH |
| `records.py` (auth-related) | 89% | GOOD | LOW |

**Overall Coverage: 77%** — Mixed security-critical paths uncovered

---

## 1. MODULE: auth.py (88% Coverage)

### Summary
- **Total Lines:** 97  
- **Uncovered Lines:** 12  
- **Missing:** 22, 27, 94-97, 109-111, 139-141

### 1.1 Line 22-27: Rate Limiter Initialization (MEDIUM)

**Location:** `backend/app/api/v1/endpoints/auth.py:19-27`

**Uncovered Code:**
```python
if settings.REDIS_ENABLED:
    try:
        from app.core.redis_rate_limit import redis_rate_limiter as auth_rate_limiter
        logger.info("Using Redis rate limiter")  # <- LINE 22: NOT COVERED
    except Exception as e:
        logger.warning(f"Redis not available, falling back to file-based: {e}")
        from app.core.rate_limit import auth_rate_limiter
else:
    from app.core.rate_limit import auth_rate_limiter  # <- LINE 27: NOT COVERED
```

**Issue:** Redis success path and disabled path never tested  
**Test Gap:**
- No test with REDIS_ENABLED=True
- No test with REDIS_ENABLED=False
- No test of Redis connection failure fallback

**Recommendation:**
```python
def test_redis_rate_limiter_configured(monkeypatch):
    """Test Redis limiter is used when enabled"""
    monkeypatch.setenv("REDIS_ENABLED", "true")
    # Re-import auth module to pick up setting
    
def test_file_rate_limiter_when_redis_disabled(monkeypatch):
    """Test file-based limiter used when Redis disabled"""
    monkeypatch.setenv("REDIS_ENABLED", "false")
```

**Priority:** MEDIUM (operational observability)

---

### 1.2 Lines 94-97: Registration Database Error Handling (CRITICAL)

**Location:** `backend/app/api/v1/endpoints/auth.py:88-97`

**Uncovered Code:**
```python
try:
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.info(f"New user registered: {db_user.id} with role {role}")
    return db_user
except Exception as e:  # <- NEVER TRIGGERED
    db.rollback()
    logger.error(f"Error registering user: {str(e)}", exc_info=True)
    raise HTTPException(status_code=500, detail="Error creating user")
```

**Issue:** Exception path never executed in any test  
**Scenarios Missing:**
1. Database connection failure
2. Constraint violation (duplicate email)
3. Database transaction commit failure
4. Transaction rollback failure

**Missing Test:**
```python
def test_register_database_error(client, mocker):
    """Test registration handles database errors gracefully"""
    mocker.patch("app.db.session.Session.commit",
                 side_effect=Exception("DB connection error"))
    
    resp = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "password": "Test@1234",
        "role": "PATIENT"
    })
    assert resp.status_code == 500
    assert "Error creating user" in resp.json()["detail"]
```

**Priority:** CRITICAL (database resilience)

---

### 1.3 Lines 109-111: Rate Limit Enforcement Check (CRITICAL)

**Location:** `backend/app/api/v1/endpoints/auth.py:108-114`

**Uncovered Code:**
```python
if settings.RATE_LIMIT_ENABLED:  # <- ALWAYS FALSE IN TESTS
    is_allowed, error_msg = auth_rate_limiter.is_allowed(email_sanitized)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_msg,
        )
```

**Issue:** RATE_LIMIT_ENABLED disabled in conftest, entire DOS protection untested  
**Missing Tests:**
1. Rate limit blocks request after threshold exceeded
2. Rate limit returns 429 Too Many Requests
3. Rate limit clears after timeout
4. Successful login resets rate limit counter
5. Different emails have separate rate limit buckets

**Missing Tests:**
```python
def test_login_rate_limit_blocks_after_threshold(client, db, monkeypatch):
    """Test rate limiting blocks excessive failed login attempts"""
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    # Re-initialize rate limiter with setting
    
    user = create_test_user(db, "test@example.com", "Test@1234")
    
    # Exceed rate limit (e.g., 5 failed attempts)
    for _ in range(6):
        client.post("/api/v1/auth/login",
            data={"username": "test@example.com", "password": "wrong"})
    
    # Next request should be rate limited
    resp = client.post("/api/v1/auth/login",
        data={"username": "test@example.com", "password": "Test@1234"})
    assert resp.status_code == 429

def test_rate_limit_per_email(client, db, monkeypatch):
    """Test rate limit is enforced per email address"""
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    
    user1 = create_test_user(db, "user1@example.com", "Test@1234")
    user2 = create_test_user(db, "user2@example.com", "Test@1234")
    
    # Exceed limit for user1
    for _ in range(6):
        client.post("/api/v1/auth/login",
            data={"username": "user1@example.com", "password": "wrong"})
    
    # user1 should be rate limited
    resp = client.post("/api/v1/auth/login",
        data={"username": "user1@example.com", "password": "Test@1234"})
    assert resp.status_code == 429
    
    # user2 should NOT be rate limited
    resp = client.post("/api/v1/auth/login",
        data={"username": "user2@example.com", "password": "wrong"})
    assert resp.status_code == 401  # Wrong password, not rate limited
```

**Priority:** CRITICAL (DOS protection verification)

---

### 1.4 Lines 139-141: Audit Log Failure Handling (HIGH)

**Location:** `backend/app/api/v1/endpoints/auth.py:133-141`

**Uncovered Code:**
```python
try:
    from app.models.models import utc_now
    from app.api.v1.endpoints.admin import log_action
    user.last_login = utc_now()
    db.commit()
    log_action(db, user, "login", "auth")
except Exception as e:  # <- NEVER TRIGGERED
    logger.warning(f"Audit log failed for {user.email}: {e}")
    db.rollback()
```

**Issue:** Exception path never triggered, audit resilience untested  
**Missing Test:**
```python
def test_login_succeeds_despite_audit_log_failure(client, db, mocker):
    """Test login succeeds even if audit logging fails"""
    user = create_test_user(db, "test@example.com", "Test@1234")
    
    mocker.patch("app.api.v1.endpoints.admin.log_action",
                 side_effect=Exception("Log service unavailable"))
    
    resp = client.post("/api/v1/auth/login",
        data={"username": "test@example.com", "password": "Test@1234"})
    
    # Login MUST succeed despite audit failure
    assert resp.status_code == 200
```

**Priority:** HIGH (resilience)

---

## 2. MODULE: authorization.py (54% Coverage) — CRITICAL GAPS

### Summary
- **Total Lines:** 37  
- **Covered:** 17 lines (54%)  
- **Missing:** All three functions inadequately tested

### 2.1 MISSING: check_record_ownership() (Lines 8-30)

**Uncovered Paths:** All admin path, partial doctor/patient logic

**Missing Test Cases:**

| Scenario | Tested | Priority |
|----------|--------|----------|
| Admin can access ANY record | NO | CRITICAL |
| Patient can access own record | NO | CRITICAL |
| Patient CANNOT access other's record | NO | CRITICAL |
| Assigned doctor can access record | NO | CRITICAL |
| Unassigned doctor CANNOT access | NO | CRITICAL |
| Record with no doctor_id | NO | CRITICAL |

**Test Suite:**
```python
class TestCheckRecordOwnership:
    def test_admin_can_access_any_record(self, db):
        admin = create_test_user(db, "admin@example.com", "Test@1234", "ADMIN")
        patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
        record = MedicalRecord(patient_id=patient.id, status="pending")
        db.add(record)
        db.commit()
        
        assert check_record_ownership(record, admin) is True
    
    def test_patient_can_access_own_record(self, db):
        patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
        record = MedicalRecord(patient_id=patient.id, status="pending")
        db.add(record)
        db.commit()
        
        assert check_record_ownership(record, patient) is True
    
    def test_patient_cannot_access_other_record(self, db):
        patient1 = create_test_user(db, "p1@example.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "p2@example.com", "Test@1234", "PATIENT")
        record = MedicalRecord(patient_id=patient1.id, status="pending")
        db.add(record)
        db.commit()
        
        assert check_record_ownership(record, patient2) is False
    
    def test_doctor_can_access_assigned_record(self, db):
        doctor = create_test_user(db, "doc@example.com", "Test@1234", "DOCTOR")
        patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
        record = MedicalRecord(patient_id=patient.id, doctor_id=doctor.id, status="pending")
        db.add(record)
        db.commit()
        
        assert check_record_ownership(record, doctor) is True
    
    def test_doctor_cannot_access_unassigned_record(self, db):
        doctor1 = create_test_user(db, "doc1@example.com", "Test@1234", "DOCTOR")
        doctor2 = create_test_user(db, "doc2@example.com", "Test@1234", "DOCTOR")
        patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
        record = MedicalRecord(patient_id=patient.id, doctor_id=doctor1.id, status="pending")
        db.add(record)
        db.commit()
        
        assert check_record_ownership(record, doctor2) is False
    
    def test_doctor_cannot_access_unassigned_no_doctor_record(self, db):
        doctor = create_test_user(db, "doc@example.com", "Test@1234", "DOCTOR")
        patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
        record = MedicalRecord(patient_id=patient.id, doctor_id=None, status="pending")
        db.add(record)
        db.commit()
        
        assert check_record_ownership(record, doctor) is False
```

**Priority:** CRITICAL (core access control)

---

### 2.2 MISSING: check_record_modification() (Lines 33-64)

**Uncovered Paths:** Patient rejection, Doctor rejection, invalid role

**Missing Test Cases:**

| Scenario | Line | Tested |
|----------|------|--------|
| Admin can modify any record | 49-50 | ? |
| Patient can modify own | 55-57 | ? |
| Patient cannot modify other | 56-57 | NO |
| Doctor can modify assigned | 58-60 | ? |
| Doctor cannot modify unassigned | 59-60 | NO |
| Invalid role rejection | 62 | NO |

**Critical Tests:**
```python
def test_patient_cannot_modify_other_record(db):
    patient1 = create_test_user(db, "p1@example.com", "Test@1234", "PATIENT")
    patient2 = create_test_user(db, "p2@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient1.id)
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_modification(record, patient2)
    assert allowed is False
    assert msg == "Forbidden"

def test_doctor_cannot_modify_unassigned(db):
    doctor1 = create_test_user(db, "doc1@example.com", "Test@1234", "DOCTOR")
    doctor2 = create_test_user(db, "doc2@example.com", "Test@1234", "DOCTOR")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, doctor_id=doctor1.id)
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_modification(record, doctor2)
    assert allowed is False
    assert "not assigned" in msg.lower()

def test_invalid_role_cannot_modify(db):
    user = create_test_user(db, "user@example.com", "Test@1234", "PATIENT")
    user.role = "SUPERADMIN"  # Invalid
    db.commit()
    record = MedicalRecord(patient_id=user.id)
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_modification(record, user)
    assert allowed is False
    assert msg == "Forbidden"
```

**Priority:** CRITICAL (authorization boundary)

---

### 2.3 MISSING: check_record_deletion() (Lines 67-104)

**Uncovered Paths:** All non-admin paths, status validation

**Critical Gap — Role/Status Deletion Matrix:**

```
              PENDING    APPROVED   COMPLETED
PATIENT_OWN     ✓          NO         NO
PATIENT_OTHER   NO         NO         NO
DOCTOR_ASSGN    ✓          NO         NO
DOCTOR_UNASSGN  NO         NO         NO
ADMIN           ✓          ✓          ✓
INVALID_ROLE    NO         NO         NO
```

**Missing Tests (8 critical scenarios):**

```python
# Admin deletion (all statuses)
def test_admin_can_delete_pending(db):
    admin = create_test_user(db, "admin@example.com", "Test@1234", "ADMIN")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, status="pending")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, admin)
    assert allowed is True
    assert msg == ""

def test_admin_can_delete_approved(db):
    """CRITICAL: Admin must override status restriction"""
    admin = create_test_user(db, "admin@example.com", "Test@1234", "ADMIN")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, status="approved")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, admin)
    assert allowed is True

def test_admin_can_delete_completed(db):
    """CRITICAL: Admin must override status restriction"""
    admin = create_test_user(db, "admin@example.com", "Test@1234", "ADMIN")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, status="completed")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, admin)
    assert allowed is True

# Patient deletion
def test_patient_can_delete_own_pending(db):
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, status="pending")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, patient)
    assert allowed is True

def test_patient_cannot_delete_other_pending(db):
    """CRITICAL: Patient ownership must be enforced"""
    patient1 = create_test_user(db, "p1@example.com", "Test@1234", "PATIENT")
    patient2 = create_test_user(db, "p2@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient1.id, status="pending")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, patient2)
    assert allowed is False
    assert msg == "Forbidden"

def test_patient_cannot_delete_own_approved(db):
    """CRITICAL: Patient status restriction must be enforced"""
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, status="approved")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, patient)
    assert allowed is False
    assert "pending" in msg.lower()

# Doctor deletion
def test_doctor_can_delete_assigned_pending(db):
    doctor = create_test_user(db, "doc@example.com", "Test@1234", "DOCTOR")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, doctor_id=doctor.id, status="pending")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, doctor)
    assert allowed is True

def test_doctor_cannot_delete_unassigned_pending(db):
    """CRITICAL: Doctor assignment must be enforced"""
    doctor1 = create_test_user(db, "doc1@example.com", "Test@1234", "DOCTOR")
    doctor2 = create_test_user(db, "doc2@example.com", "Test@1234", "DOCTOR")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, doctor_id=doctor1.id, status="pending")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, doctor2)
    assert allowed is False
    assert "not assigned" in msg.lower()

def test_doctor_cannot_delete_assigned_approved(db):
    """CRITICAL: Doctor status restriction must be enforced"""
    doctor = create_test_user(db, "doc@example.com", "Test@1234", "DOCTOR")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = MedicalRecord(patient_id=patient.id, doctor_id=doctor.id, status="approved")
    db.add(record)
    db.commit()
    
    allowed, msg = check_record_deletion(record, doctor)
    assert allowed is False
    assert "pending" in msg.lower()
```

**Priority:** CRITICAL (deletion authorization is core security)

---

## 3. RECORDS ENDPOINT AUTHORIZATION (lines 154-171)

### 3.1 Delete Endpoint Integration Test

**Location:** `backend/app/api/v1/endpoints/records.py:154-171`

**Coverage Status:** Likely 36% on records.py

**Missing Integration Tests:**

```python
def test_delete_record_patient_own_pending(client, db):
    """Integration: Patient can delete own pending record"""
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = create_record_in_db(db, patient.id, status="pending")
    login_user(client, "patient@example.com", "Test@1234")
    
    resp = client.delete(f"/api/v1/records/{record.id}")
    assert resp.status_code == 204

def test_delete_record_patient_cannot_delete_approved(client, db):
    """Integration: Patient cannot delete approved record"""
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    record = create_record_in_db(db, patient.id, status="approved")
    login_user(client, "patient@example.com", "Test@1234")
    
    resp = client.delete(f"/api/v1/records/{record.id}")
    assert resp.status_code == 403
    assert "pending" in resp.json()["detail"].lower()

def test_delete_record_admin_can_delete_any_status(client, db):
    """Integration: Admin can delete any status"""
    admin = create_test_user(db, "admin@example.com", "Test@1234", "ADMIN")
    patient = create_test_user(db, "patient@example.com", "Test@1234", "PATIENT")
    
    for status in ["pending", "approved", "completed"]:
        record = create_record_in_db(db, patient.id, status=status)
        login_user(client, "admin@example.com", "Test@1234")
        
        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 204, f"Admin failed to delete {status} record"
```

**Priority:** CRITICAL

---

## 4. SUMMARY & PRIORITY RANKING

### CRITICAL (Fix Immediately - Security Boundary)

| # | Module | Gap | Lines | Tests | Risk |
|---|--------|-----|-------|-------|------|
| 1 | authorization.py | check_record_deletion - missing matrix | 84-104 | 8 | Unauthorized deletion |
| 2 | authorization.py | check_record_ownership - all paths | 8-30 | 6 | Unauthorized access |
| 3 | authorization.py | check_record_modification - roles | 33-64 | 5 | Unauthorized modification |
| 4 | auth.py | Database error handling | 94-97 | 2 | Silent failures |
| 5 | auth.py | Rate limit enforcement | 109-111 | 3 | DOS unprotected |

### HIGH (Fix Before Release)

| # | Module | Gap | Lines | Tests | Risk |
|---|--------|-----|-------|-------|------|
| 6 | auth.py | Audit log resilience | 139-141 | 2 | Failed audits |
| 7 | records.py | Delete authorization matrix | 160-170 | 5 | Mixed auth |

### MEDIUM (Fix Before Production)

| # | Module | Gap | Lines | Tests | Risk |
|---|--------|-----|-------|-------|------|
| 8 | auth.py | Rate limiter init | 22, 27 | 2 | Config obs |

---

## 5. EFFORT ESTIMATE

**Total Effort:** ~14 hours  
**Total New Tests:** 34  

| Phase | Hours | Tests |
|-------|-------|-------|
| Authorization unit tests | 6 | 19 |
| Auth endpoint exception tests | 2 | 7 |
| Rate limiter configuration | 1.5 | 5 |
| Records integration tests | 3 | 5 |
| Code review & fixes | 1.5 | - |

---

**End of Report**
