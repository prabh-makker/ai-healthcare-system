# AI Healthcare Backend - Test Coverage Gap Analysis

**Analysis Date:** May 19, 2026  
**Overall Coverage:** 94% | **Target:** 95%+ | **Gap:** +1-2%

---

## Coverage by Module

| Module | Current | Target | Gap | Status |
|--------|---------|--------|-----|--------|
| `auth.py` | 83% | 95% | +12% | ⚠️ NEEDS WORK |
| `authorization.py` | 95% | 95% | — | ✓ GOOD |
| `security.py` | 86% | 95% | +9% | ⚠️ NEEDS WORK |
| `records.py` | 98% | 95% | -3% | ✓ EXCELLENT |
| `models.py` | 100% | 95% | -5% | ✓ PERFECT |

---

## 1. AUTHENTICATION (`auth.py`) - 83% → 95%

### Uncovered Code Paths (17 lines)

**Lines 22, 27** - Redis/File-based rate limiter conditional imports
- Path: `if settings.REDIS_ENABLED:` → `except Exception:` fallback
- Status: Never tested; rate limiter is mocked in tests
- Impact: LOW (infrastructure dependency)

**Lines 48-50, 55, 59** - Rate limiting in `change_password`
- Path: When `RATE_LIMIT_ENABLED=False`, these lines don't execute
- Issue: Rate limiting disabled scenario untested
- Impact: MEDIUM (security feature bypass path)
- **Test Needed:** `test_change_password_with_rate_limit_disabled`

**Lines 104-107** - Exception handler in `register_user`
```python
except Exception as e:
    db.rollback()
    logger.error(...)
    raise HTTPException(status_code=500, detail="Error creating user")
```
- Issue: Database errors (constraint violation, connection failure) untested
- Impact: HIGH (error handling, information leakage)
- **Tests Needed:** 
  - `test_register_with_database_error`
  - `test_register_duplicate_email_db_constraint` (verify rollback)

**Lines 119-121** - Rate limiting in `login_access_token` when disabled
- Path: `if settings.RATE_LIMIT_ENABLED:` → skip lines
- Issue: Same as change_password
- Impact: MEDIUM (rate limiting bypass)
- **Test Needed:** `test_login_with_rate_limit_disabled`

**Lines 149-151** - Exception handler in `login_access_token`
```python
except Exception as e:
    logger.warning(f"Audit log failed for {user.email}: {e}")
    db.rollback()
```
- Issue: Audit logging failures don't prevent login (correct behavior but untested)
- Impact: LOW (edge case; user still gets logged in)
- **Test Needed:** `test_login_continues_despite_audit_log_failure`

### New Tests to Add (7 tests)

```python
# backend/tests/test_auth_edge_cases.py

def test_change_password_with_rate_limit_disabled(client, db):
    """When RATE_LIMIT_ENABLED=False, rate limiting code is skipped."""
    # Setup: user, disable rate limiting
    # Verify: rate limiting logic not executed (can't verify directly, but ensure no 429 errors)

def test_change_password_rate_limit_exceeded(client, db):
    """Multiple failed attempts trigger 429 rate limit."""
    # Setup: user, enable rate limiting
    # Act: 10+ failed password change attempts
    # Assert: 429 Too Many Requests

def test_register_with_database_error(client, db, monkeypatch):
    """Database connection error during registration."""
    # Setup: monkeypatch db.commit() to raise Exception
    # Act: register_user()
    # Assert: 500, verify rollback called

def test_login_with_rate_limit_disabled(client, db):
    """When RATE_LIMIT_ENABLED=False, rate limiting check skipped."""
    # Similar to change_password test

def test_login_continues_despite_audit_log_failure(client, db, monkeypatch):
    """Audit log failure doesn't prevent login."""
    # Setup: monkeypatch log_action to raise Exception
    # Act: login
    # Assert: 200, token returned, user logged in
```

---

## 2. AUTHORIZATION (`authorization.py`) - 95% → 95%

### Minor Gaps (2 lines)

**Lines 62, 98** - Else clauses for unknown/invalid roles
```python
else:
    return False, "Forbidden"
```
- These handle non-PATIENT/DOCTOR/ADMIN roles
- Status: Defensive code; UserRole enum prevents invalid values
- Impact: NEGLIGIBLE (enum constraint)
- **Optional Test:**
  - `test_check_record_deletion_with_invalid_role` (mock enum bypass)

### Coverage Status: EXCELLENT ✓

All 26 deletion matrix combinations tested:
- Admin: 4 status combos (pending, approved, completed, reviewed)
- Patient: 5 combos (own/other × pending/approved)
- Doctor: 6 combos (assigned/unassigned × pending/approved/completed)

All ownership and modification checks covered.

---

## 3. SECURITY (`security.py`) - 86% → 95%

### Uncovered Code Paths (12 lines)

**Lines 45-48** - `sanitize_username()` function
```python
def sanitize_username(username: str) -> str:
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', username.strip())
    if len(sanitized) < 3:
        return ""
    return sanitized[:50]
```
- Status: Function unused in current codebase (defensive/future use)
- All paths untested
- Impact: LOW (dead code, but should test before shipping)
- **Tests Needed (3):**
  - `test_sanitize_username_valid`
  - `test_sanitize_username_too_short_returns_empty`
  - `test_sanitize_username_exceeds_50_chars`

**Line 66-67** - `verify_password()` exception handler
```python
except (ValueError, TypeError):
    return False
```
- Issue: Bcrypt hash validation errors untested
- Scenario: Malformed bcrypt hash (corrupted DB, manual edit)
- Impact: MEDIUM (security boundary)
- **Test Needed:** `test_verify_password_with_malformed_bcrypt_hash`

**Line 80** - `verify_token()` missing 'sub' claim
```python
if user_id is None:
    raise JWTError("No user ID in token")
```
- Issue: Token without `sub` claim untested
- Scenario: Malformed JWT (missing required claim)
- Impact: MEDIUM (token validation bypass)
- **Test Needed:** `test_verify_token_missing_sub_claim`

**Line 119** - `get_current_user()` no token extracted
```python
if not token:
    raise credentials_exception
```
- Status: Cookie AND Authorization header both absent
- Already tested implicitly in `test_me_unauthenticated`
- Impact: LOW (already covered)

**Line 121** - `get_current_user()` inactive user
```python
if not user.is_active:
    raise HTTPException(status_code=400, detail="Inactive user")
```
- Status: Tested in `test_login_inactive_user`, but path from `get_current_user` directly untested
- Scenario: Inactive user tries to access `/me`
- Impact: LOW (mostly covered; minor gap)
- **Test Needed:** `test_get_current_user_rejects_inactive_user`

**Lines 127-132** - `require_role()` insufficient permissions
```python
def require_role(*roles: str):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker
```
- Issue: Authorization failure path untested in context of endpoints
- Scenario: PATIENT accessing DOCTOR-only endpoint
- Impact: HIGH (authorization bypass risk)
- **Test Needed:** `test_require_role_insufficient_permissions` (integration test)

### New Tests to Add (6-7 tests)

```python
# backend/tests/test_security_edge_cases.py

def test_sanitize_username_valid(self):
    """Valid username preserved."""
    assert sanitize_username("user_name-123") == "user_name-123"

def test_sanitize_username_invalid_chars_removed(self):
    """Invalid characters stripped."""
    assert sanitize_username("user@name!") == "username"

def test_sanitize_username_too_short_returns_empty(self):
    """Less than 3 chars returns empty string."""
    assert sanitize_username("ab") == ""
    assert sanitize_username("a!") == ""

def test_sanitize_username_truncates_at_50(self):
    """Exceeds 50 chars gets truncated."""
    long_name = "a" * 60
    assert len(sanitize_username(long_name)) == 50

def test_verify_password_with_malformed_bcrypt_hash(self):
    """Corrupted bcrypt hash returns False."""
    assert verify_password("password", "not_a_valid_hash") == False
    assert verify_password("password", "$2b$invalid") == False

def test_verify_token_missing_sub_claim(self):
    """Token without 'sub' claim raises JWTError."""
    bad_token = jwt.encode({"exp": datetime.now() + timedelta(hours=1)}, settings.SECRET_KEY)
    with pytest.raises(JWTError):
        verify_token(bad_token)

def test_get_current_user_rejects_inactive_user(client, db):
    """Inactive user accessing /me endpoint gets 400."""
    # Setup: create inactive user, login, deactivate
    # Act: GET /api/v1/auth/me with cookie
    # Assert: 400 "Inactive user"

def test_require_role_insufficient_permissions(client, db):
    """PATIENT accessing DOCTOR-only endpoint returns 403."""
    # Setup: PATIENT user logged in
    # Act: POST /api/v1/records/bulk-approve (DOCTOR_ADMIN only)
    # Assert: 403 "Insufficient permissions"
```

---

## 4. RECORDS ENDPOINT (`records.py`) - 98% → 95%

**Status: EXCELLENT** ✓✓

Only 3 lines missing (likely dead code in serialization).
All authorization checks, role-based filtering, and deletion matrix covered.

No action needed.

---

## 5. MODELS (`models.py`) - 100% → 95%

**Status: PERFECT** ✓✓

Complete coverage. All enums, decorators, and relationships tested.

No action needed.

---

## Implementation Roadmap

### Phase 1: CRITICAL (2-3 hours) - Deploy before production

1. **`test_require_role_insufficient_permissions`** (1 test, 15 min)
   - Tests authorization failure path
   - Prevent privilege escalation bugs
   
2. **`test_register_with_database_error`** (1 test, 20 min)
   - Tests error handling in registration
   - Prevent information leakage
   
3. **`test_login_with_rate_limit_disabled`** (1 test, 15 min)
   - Tests rate limiting disabled path
   - Ensure feature works when disabled

4. **`test_change_password_with_rate_limit_disabled`** (1 test, 15 min)
   - Similar to login test

**Improvement: +0.5-1%**

### Phase 2: HIGH (1-2 hours) - Deploy before v1.1

5. **`test_verify_password_with_malformed_hash`** (1 test, 15 min)
   - Edge case in password verification
   
6. **`test_verify_token_missing_sub_claim`** (1 test, 15 min)
   - Token validation edge case
   
7. **`test_get_current_user_rejects_inactive_user`** (1 test, 15 min)
   - Direct path test (implicit coverage exists)

**Improvement: +0.3-0.5%**

### Phase 3: MEDIUM (1-2 hours) - Nice to have

8. **`test_sanitize_username_*`** (4 tests, 30 min)
   - Defensive code coverage
   - No current use but clean up dead code or remove function
   
9. **`test_login_continues_despite_audit_log_failure`** (1 test, 20 min)
   - Edge case: audit system down doesn't block login

**Improvement: +0.2%**

---

## Priority Test Additions

### To Reach 95%+ Coverage (Minimum)

**Required:** 4-6 tests  
**Time:** 1.5-2 hours

```python
# Must implement for compliance:
1. test_require_role_insufficient_permissions  (CRITICAL)
2. test_register_with_database_error           (CRITICAL)
3. test_login_with_rate_limit_disabled         (HIGH)
4. test_change_password_with_rate_limit_disabled (HIGH)
5. test_verify_password_with_malformed_hash    (MEDIUM)
6. test_verify_token_missing_sub_claim         (MEDIUM)
```

### To Reach 96%+ Coverage (Recommended)

**Additional:** +4-5 tests  
**Total Time:** 3-4 hours

```python
# Also implement:
7. test_sanitize_username_* (4 tests)
8. test_get_current_user_rejects_inactive_user
9. test_login_continues_despite_audit_log_failure
10. test_check_record_deletion_with_invalid_role (optional)
```

---

## Files to Create/Modify

```
backend/tests/
├── conftest.py (ADD: role_based_fixtures, db_error_fixtures)
├── test_auth_edge_cases.py (NEW: rate limiting, DB errors)
├── test_security_edge_cases.py (NEW: password verification, token validation)
└── test_authorization.py (MODIFY: add invalid role tests)
```

---

## Summary

**Current State:** 94% overall, with critical gaps in rate limiting and error handling

**Gaps:** 
- Rate limiting disabled paths (auth.py)
- Database error handling (auth.py)
- Role authorization failures (security.py)
- Token/password validation edge cases (security.py)

**To Fix:** 
- Add 4-6 critical tests (minimum, 1.5-2 hours)
- Add 4-5 additional tests (recommended, 1-2 hours)

**Expected Result:** 95-96% overall coverage with all security-critical paths tested

**Risk Level Without Fixes:** MEDIUM - Rate limiting and error handling gaps could lead to DoS or information leakage
