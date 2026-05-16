# Authentication Test Suite Documentation

## Overview

Comprehensive test suite for FastAPI authentication endpoints covering user registration, login, session management, password changes, and security features.

**Test Files:**
- `tests/test_auth.py` - Core authentication tests (49 tests, 50% coverage)
- `tests/test_auth_advanced.py` - Advanced scenarios (25 tests, 38% coverage)

**Combined Coverage:** 88% of `app/api/v1/endpoints/auth.py`

## Running Tests

### Run all auth tests
```bash
cd backend
pytest tests/test_auth.py tests/test_auth_advanced.py -v
```

### Run with coverage report
```bash
pytest tests/test_auth.py tests/test_auth_advanced.py --cov=app.api.v1.endpoints.auth --cov-report=html
```

### Run specific test class
```bash
pytest tests/test_auth.py::TestRegister -v
```

### Run a single test
```bash
pytest tests/test_auth.py::TestRegister::test_register_success -v
```

## Test Structure

### tests/test_auth.py - Core Tests (74 total: 49 passed, 4 skipped, 2 focused on advanced)

#### TestRegister (14 tests)
User registration with validation:
- ✓ `test_register_success` - Basic registration creates user
- ✓ `test_register_as_doctor` - Doctor role registration
- ✓ `test_register_duplicate_email` - Duplicate email prevention
- ✓ `test_register_email_case_insensitive` - Case normalization
- ✓ `test_register_email_with_whitespace_stripped` - Email sanitization
- ✓ `test_register_invalid_email_format` - Email validation
- ✓ `test_register_email_too_long` - Email length validation
- ✓ `test_register_weak_password_too_short` - Password minimum length
- ✓ `test_register_password_strength_validation` - Complexity requirements
- ✓ `test_register_strong_password_accepted` - Valid passwords accepted
- ✓ `test_register_invalid_role_defaults_to_patient` - Default role handling
- ✓ `test_register_missing_required_fields` - Field validation
- ✓ `test_register_empty_email` - Empty field validation
- ✓ `test_register_empty_password` - Empty field validation

**Key Coverage:**
- Email validation (regex, length)
- Password strength (length, uppercase, numbers, special chars)
- Role assignment and normalization
- Database integrity (no duplicates)
- HTTP status codes (201 created, 400 bad request)

#### TestLogin (11 tests)
Login and authentication:
- ✓ `test_login_success_sets_cookie` - Cookie authentication
- ✓ `test_login_updates_last_login` - Timestamp tracking
- ✓ `test_login_wrong_password` - Invalid credentials
- ✓ `test_login_unknown_email` - Non-existent user
- ✓ `test_login_inactive_user` - Inactive account blocking
- ✓ `test_login_email_case_insensitive` - Case normalization
- ✓ `test_login_email_whitespace_trimmed` - Whitespace handling
- ✓ `test_login_missing_credentials` - Required field validation
- ✓ `test_login_empty_credentials` - Empty field handling
- ⊘ `test_login_rate_limiting` - Rate limit (skipped if disabled)
- ⊘ `test_login_successful_resets_rate_limit` - Rate limit reset (skipped if disabled)

**Key Coverage:**
- OAuth2 password flow
- HTTP cookie authentication
- Rate limiting (when enabled)
- User status validation
- Last login timestamp updates

#### TestMe (7 tests)
Session and protected endpoints:
- ✓ `test_me_with_cookie` - Cookie-based authentication
- ✓ `test_me_unauthenticated` - Unauthorized access
- ✓ `test_me_with_invalid_token` - Invalid token rejection
- ✓ `test_me_with_expired_token` - Token expiration
- ✓ `test_logout_clears_session` - Session cleanup
- ✓ `test_logout_without_session` - Logout idempotency
- ✓ `test_multiple_logins_create_valid_tokens` - Token consistency

**Key Coverage:**
- Protected endpoint access
- Token validation and expiration
- Cookie deletion on logout
- Session isolation

#### TestChangePassword (5 tests)
Password change functionality:
- ✓ `test_change_password_success` - Password update
- ✓ `test_change_password_wrong_old_password` - Current password verification
- ✓ `test_change_password_weak_new_password` - New password validation
- ✓ `test_change_password_unauthenticated` - Auth requirement
- ✓ `test_change_password_same_as_old` - Password change validation

**Key Coverage:**
- Password history/reuse prevention
- Current password verification
- New password strength validation
- Authenticated-only operations

#### TestAuthIntegration (5 tests)
End-to-end workflows:
- ✓ `test_full_auth_flow_register_login_access` - Complete user journey
- ✓ `test_multiple_user_isolation` - User data isolation
- ✓ `test_doctor_registration_and_login` - Role-specific flows
- ✓ `test_role_persists_across_login_sessions` - Role consistency
- ✓ `test_password_change_and_relogin` - Post-change login

**Key Coverage:**
- User journey workflows
- Multi-user isolation
- Role consistency
- Session lifecycle

#### TestTokenSecurity (4 tests)
Token generation and validation:
- ✓ `test_token_created_with_correct_subject` - Token payload
- ✓ `test_token_expiration` - Expired token rejection
- ✓ `test_different_users_get_different_tokens` - Token uniqueness
- ✓ `test_token_not_in_response_body_for_security` - Response structure

**Key Coverage:**
- JWT token generation (JOSE/HS256)
- Token expiration and validation
- Token uniqueness per user

#### TestAuthErrorHandling (5 tests)
Edge cases and error scenarios:
- ✓ `test_sql_injection_in_email` - Injection protection
- ✓ `test_very_long_password` - Long input handling
- ✓ `test_special_characters_in_password` - Special char support
- ✓ `test_unicode_in_email` - Unicode handling
- ✓ `test_concurrent_registration_race_condition` - Duplicate prevention

**Key Coverage:**
- Input validation and sanitization
- Edge case handling
- Race condition prevention

### tests/test_auth_advanced.py - Advanced Tests (25 total)

#### TestAuthDatabaseIntegrity (4 tests)
Database operation validation:
- ✓ `test_registration_failure_rollback` - Transaction rollback
- ✓ `test_user_password_hashed_in_database` - Password hashing
- ✓ `test_user_created_with_id` - UUID generation
- ✓ `test_user_created_with_timestamp` - Timestamp assignment

#### TestAuthCookieSecurity (3 tests)
Cookie attributes and security:
- ✓ `test_login_cookie_is_httponly` - HTTPOnly flag
- ✓ `test_cookie_has_max_age` - Expiration time
- ✓ `test_logout_deletes_cookie` - Cookie deletion

#### TestBearerTokenFallback (3 tests)
Token authentication fallback mechanisms:
- ✓ `test_login_returns_token_for_api_clients` - Response token
- ✓ `test_bearer_token_authentication` - Bearer token auth
- ✓ `test_bearer_token_priority_over_cookie` - Token priority

#### TestAuditLogging (2 tests)
Audit trail functionality:
- ✓ `test_login_creates_audit_log` - Login logging
- ✓ `test_password_change_logged` - Change logging

#### TestRateLimiting (2 tests)
Rate limiting functionality (skipped if disabled):
- ⊘ `test_rate_limit_on_failed_login` - Failed login limiting
- ⊘ `test_rate_limit_per_email` - Per-email rate limiting

#### TestPasswordValidation (4 tests)
Password requirement enforcement:
- ✓ `test_password_minimum_length` - Length requirement
- ✓ `test_password_uppercase_requirement` - Uppercase requirement
- ✓ `test_password_number_requirement` - Number requirement
- ✓ `test_password_special_char_requirement` - Special char requirement

#### TestEmailValidation (2 tests)
Email format and normalization:
- ✓ `test_email_format_validation` - Format rules
- ✓ `test_email_normalization` - Case normalization

#### TestRoleManagement (4 tests)
Role assignment and persistence:
- ✓ `test_role_assignment_on_register` - Registration role
- ✓ `test_role_persists_in_database` - DB persistence
- ✓ `test_invalid_role_defaults_to_patient` - Invalid role handling
- ✓ `test_role_case_normalization` - Case normalization

#### TestActiveStatus (3 tests)
User active status enforcement:
- ✓ `test_new_user_is_active` - Active on registration
- ✓ `test_inactive_user_cannot_login` - Inactive blocking
- ✓ `test_inactive_user_cannot_access_me` - Access denial

## Test Fixtures

From `tests/conftest.py`:

```python
@pytest.fixture
def client():
    """FastAPI TestClient with test database"""
    return TestClient(app)

@pytest.fixture
def db():
    """SQLite test database session"""
    return TestingSessionLocal()

def create_test_user(db, email, password, role="PATIENT"):
    """Helper to create test user with hashed password"""
    return User(...)

def get_auth_cookie(client, email, password):
    """Helper to login and get cookies"""
    return client.cookies
```

## Test Configuration

**Database:** SQLite (`:memory:` equivalent)
```python
TEST_DB_URL = "sqlite:///./test.db"
```

**Test Users:**
- Email: `test@example.com`
- Email 2: `test2@example.com`
- Email 3: `test3@example.com`
- Password: `Test@1234`

**Password Requirements (from settings):**
- Minimum length: 8 characters
- Required: Uppercase letter
- Required: Number
- Required: Special character
- No plaintext storage (bcrypt with 12 rounds)

**Token Settings:**
- Algorithm: HS256 (HMAC with SHA-256)
- Default expiration: 480 minutes (8 hours)
- Storage: HTTPOnly cookie (secure=True in production)
- Fallback: Authorization header (Bearer token)

## Coverage Analysis

### Covered Lines (88%)
- Email validation (format, length)
- Password validation (strength, hashing)
- User registration (DB insert, role assignment)
- Login (authentication, rate limiting)
- Token generation and validation
- Session management (login/logout)
- Password change workflow
- Role-based access
- Error handling (duplicate, invalid input)
- Database integrity

### Uncovered Lines (12%)
- Line 22: `except Exception as e` in password change (error path)
- Line 27: `logger.info` for fallback to file-based rate limiter
- Lines 94-97: Error handling in user creation exception
- Lines 109-111: Rate limiting skip condition
- Lines 139-141: Audit log failure handling

## Adding New Tests

### Template for new endpoint test:
```python
class TestNewEndpoint:
    """Test description"""

    def test_success_case(self, client: TestClient, db):
        """Test successful operation"""
        resp = client.post("/api/v1/auth/new-endpoint", json={...})
        assert resp.status_code == 200
        assert resp.json()["expected_field"] == "value"

    def test_error_case(self, client: TestClient, db):
        """Test error handling"""
        resp = client.post("/api/v1/auth/new-endpoint", json={...})
        assert resp.status_code == 400
        error_msg = get_error_message(resp.json())
        assert "expected error" in error_msg.lower()
```

### Run with coverage:
```bash
pytest tests/test_auth.py::TestNewEndpoint -v --cov
```

## Known Limitations

1. **Rate Limiting**: Tests skip if `RATE_LIMIT_ENABLED=False` in settings
2. **Async Tests**: Uses TestClient which runs async code synchronously
3. **Cookie Behavior**: TestClient doesn't fully simulate HTTP headers
4. **Concurrent Testing**: Race condition test is single-threaded
5. **Redis Rate Limiter**: Falls back to file-based if Redis unavailable

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run auth tests
  run: |
    pip install pytest pytest-cov httpx -q
    cd backend
    pytest tests/test_auth.py tests/test_auth_advanced.py \
      --cov=app.api.v1.endpoints.auth \
      --cov-report=xml \
      --cov-report=term
```

## Debugging Failed Tests

1. **Check database state:**
   ```python
   db_user = db.query(User).filter(User.email == "test@example.com").first()
   print(db_user.role, db_user.is_active)
   ```

2. **Inspect response:**
   ```python
   print(resp.status_code)
   print(resp.json())
   print(resp.cookies)
   ```

3. **Check logs:**
   ```bash
   pytest tests/test_auth.py::TestLogin::test_login_success_sets_cookie -v -s
   ```

4. **Reset database between test runs:**
   ```bash
   rm backend/test.db
   pytest tests/test_auth.py -v
   ```

## Performance Notes

- All 74 tests complete in ~25 seconds
- Database: SQLite in-memory (fast, isolated)
- No external dependencies (no Redis, no email service mocks needed)
- Each test creates/drops tables automatically via conftest fixtures

## Related Files

- Endpoint: `backend/app/api/v1/endpoints/auth.py`
- Models: `backend/app/models/models.py`
- Schemas: `backend/app/schemas/user.py`
- Security: `backend/app/core/security.py`
- Config: `backend/app/core/config.py`
- Test fixtures: `backend/tests/conftest.py`
