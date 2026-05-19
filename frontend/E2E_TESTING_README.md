# E2E Testing with Playwright

End-to-end testing for the AI Healthcare frontend using Playwright.

## Setup

### Prerequisites
- Node.js 18+ installed
- Frontend development server running (`npm run dev` on port 3006)
- Backend API running on port 8006

### Installation

```bash
npm install -D @playwright/test --legacy-peer-deps
```

## Running Tests

### All E2E Tests
```bash
npm run e2e
```

### Run with Browser Visible (Headed Mode)
```bash
npm run e2e:headed
```

### Interactive Debug Mode
```bash
npm run e2e:debug
```

### UI Test Runner (Visual)
```bash
npm run e2e:ui
```

### Run Specific Test Suites

```bash
# Authentication flows only
npm run e2e:auth

# Patient user flows
npm run e2e:patient

# Doctor user flows
npm run e2e:doctor

# Admin user flows
npm run e2e:admin

# Single test file
npx playwright test e2e/auth.spec.ts

# Single test
npx playwright test e2e/auth.spec.ts -g "Patient login"
```

### Run with Options

```bash
# Show browser (headed)
npx playwright test --headed

# Debug mode with inspector
npx playwright test --debug

# Multiple workers (parallel)
npx playwright test --workers=4

# No parallel (serial)
npx playwright test --workers=1

# Retry failed tests
npx playwright test --retries=2

# Take screenshots on failure
npx playwright test --screenshot=only-on-failure

# Trace on failure
npx playwright test --trace=on-first-retry
```

## Test Structure

### Test Files
- **`auth.spec.ts`** (5 tests) - Login/logout flows for all roles
- **`patient-flow.spec.ts`** (6 tests) - Patient user journey (book appointments, view history, etc.)
- **`doctor-flow.spec.ts`** (6 tests) - Doctor user journey (calendar, attendance, patient records)
- **`admin-flow.spec.ts`** (8 tests) - Admin user journey (manage users, view stats, etc.)

### Total: 25 E2E Test Cases

## User Test Credentials

| Role | Email | Password |
|---|---|---|
| Patient | `aarav.kumar@example.com` | `Patient@1234` |
| Doctor | `dr.sharma@healthai.com` | `Doctor@1234` |
| Admin | `admin@healthai.com` | `Admin@1234` |

## Test Coverage

### Authentication
- ✅ Patient login and dashboard access
- ✅ Doctor login and dashboard access  
- ✅ Admin login and admin features
- ✅ Invalid credentials error handling
- ✅ Logout functionality

### Patient User Flow
- ✅ View appointments list
- ✅ Book new appointment
- ✅ View medical history/records
- ✅ Update profile information
- ✅ Search doctors
- ✅ Cancel appointments

### Doctor User Flow
- ✅ View weekly calendar
- ✅ Mark appointments as completed
- ✅ Mark attendance
- ✅ View patient records
- ✅ Add medical records for patients
- ✅ Request leave

### Admin User Flow
- ✅ Access admin dashboard
- ✅ View system users
- ✅ Search users by name
- ✅ View attendance logs
- ✅ Manage leave applications
- ✅ View system statistics
- ✅ Access audit logs
- ✅ Export user data

## Configuration

See `playwright.config.ts` for:
- Browser configuration (Chromium, Firefox)
- Base URL (http://localhost:3006)
- Timeout settings
- Screenshot/trace capture on failure
- Web server auto-start

## Reports

After running tests:
- **HTML Report**: `npx playwright show-report`
- **JUnit Report**: Configure in `playwright.config.ts`
- **JSON Report**: Available in CI/CD pipelines

## Troubleshooting

### Tests timeout
- Increase `timeout` in `playwright.config.ts`
- Check if backend is running on port 8006
- Verify frontend is running on port 3006

### Cannot find element
- Elements use `data-testid` attributes
- Add missing selectors to application components
- Check console logs: `--debug` mode

### Tests pass locally but fail in CI
- May need to adjust timing (waitForURL timeouts)
- Ensure test data/seed users exist
- Check environment variables

### Screenshot/Trace Issues
- Clear `.auth` directory if authentication cached
- Remove `playwright/.cache` if browser issues
- Re-run with `--headed` to debug visually

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Run E2E Tests
  run: |
    npm ci
    npm run build
    npx playwright install --with-deps
    npm run e2e
```

## Performance Notes

- Tests run in parallel by default (workers = 1/4 CPU cores)
- Total test suite: ~3-5 minutes
- Per-test average: 10-15 seconds
- Screenshots on failure add ~2-3 seconds per test

## Future Enhancements

- [ ] Visual regression testing (screenshots)
- [ ] Performance monitoring (Lighthouse)
- [ ] Accessibility testing (Axe)
- [ ] Multi-browser testing (WebKit, Safari)
- [ ] Mobile viewport testing
- [ ] API mocking for isolated tests
- [ ] Advanced workflows (appointment → diagnosis → follow-up)
