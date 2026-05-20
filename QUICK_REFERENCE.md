# 🚀 AI Healthcare System - Quick Reference Card

## 🌐 System Access Points

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | `http://localhost:3006` | ✅ Running |
| **Backend API** | `http://localhost:8006` | ✅ Running |
| **API Health** | `http://localhost:8006/api/v1/health` | ✅ Healthy |
| **Database** | `localhost:5432` (PostgreSQL) | ✅ Running |
| **Cache** | `localhost:6379` (Redis) | ✅ Running |

---

## 👤 Test Credentials

### 👨‍🏥 Patient Account
```
Email:    aarav.kumar@example.com
Password: Patient@1234
Role:     PATIENT
Status:   ✅ Verified & Working
```

### 👨‍⚕️ Doctor Account
```
Email:    dr.sharma@healthai.com
Password: Doctor@1234
Role:     DOCTOR
Status:   ✅ Available
```

### 👮 Admin Account
```
Email:    admin@healthai.com
Password: Admin@1234
Role:     ADMIN
Status:   ✅ Available
```

---

## 🛠️ Startup Commands

### Start All Services
```bash
# Open terminal in docker directory
cd docker
docker-compose up -d

# Open another terminal in frontend directory
cd frontend
npm run dev
```

### Stop All Services
```bash
cd docker
docker-compose down
```

---

## 🧪 Running Tests

### Backend Tests (50 tests, ~15 seconds)
```bash
cd backend
pytest -v tests/test_coverage_gaps.py
```

### E2E Tests (50 tests, all browsers, ~5-10 minutes)
```bash
cd frontend
npm run e2e
```

### E2E Tests by Category
```bash
# Authentication tests only
npm run e2e:auth

# Patient flow tests
npm run e2e:patient

# Doctor flow tests
npm run e2e:doctor

# Admin flow tests
npm run e2e:admin

# Interactive mode (see browser)
npm run e2e:headed

# Debug mode
npm run e2e:debug
```

---

## 📊 System Verification Checklist

- [ ] **Docker Services**
  - [ ] PostgreSQL container running: `docker ps | grep postgres`
  - [ ] Redis container running: `docker ps | grep redis`
  - [ ] Backend container running: `docker ps | grep backend`

- [ ] **API Connectivity**
  - [ ] Backend health: `curl http://localhost:8006/api/v1/health`
  - [ ] Response: `{"status":"healthy","version":"1.0.0"}`

- [ ] **Frontend Access**
  - [ ] Page loads: `http://localhost:3006`
  - [ ] Redirects to login: `http://localhost:3006/login`
  - [ ] Forms render correctly

- [ ] **Authentication**
  - [ ] Can login with patient credentials
  - [ ] JWT token created
  - [ ] Dashboard displays correctly
  - [ ] Can logout

---

## 📁 Important File Locations

### Configuration Files
| File | Purpose | Location |
|------|---------|----------|
| `.env.docker` | Docker environment | `docker/.env.docker` |
| `docker-compose.yml` | Docker services | `docker/docker-compose.yml` |
| `playwright.config.ts` | E2E test config | `frontend/playwright.config.ts` |
| `.env` | Backend config | `backend/.env` |

### Test Files
| File | Tests | Location |
|------|-------|----------|
| `test_coverage_gaps.py` | 50 backend tests | `backend/tests/` |
| `auth.spec.ts` | 5 auth tests | `frontend/e2e/` |
| `patient-flow.spec.ts` | 6 patient tests | `frontend/e2e/` |
| `doctor-flow.spec.ts` | 6 doctor tests | `frontend/e2e/` |
| `admin-flow.spec.ts` | 8 admin tests | `frontend/e2e/` |

### Documentation
- `SYSTEM_STATUS.md` - Full system status
- `CONTINUATION_SESSION_REPORT.md` - This session details
- `AUTOMATION_SUMMARY.md` - Automation reference
- `COVERAGE_95_REPORT.md` - Coverage details
- `API_DOCUMENTATION_INDEX.md` - API endpoints

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3006 (frontend)
netstat -ano | grep 3006

# Check what's using port 8006 (backend)
netstat -ano | grep 8006

# Check what's using port 5432 (postgres)
netstat -ano | grep 5432

# Kill process by PID (on Windows)
taskkill /PID <pid> /F

# Or using PowerShell
Stop-Process -Id <pid> -Force
```

### Docker Services Won't Start
```bash
# Check Docker status
docker ps

# Check logs
docker logs aihealthcare-backend
docker logs aihealthcare-postgres
docker logs aihealthcare-redis

# Restart services
docker-compose restart

# Full reset
docker-compose down
docker-compose up -d
```

### Frontend Can't Connect to Backend
```bash
# Verify backend is responding
curl http://localhost:8006/api/v1/health

# Check frontend logs (in browser console)
Open DevTools (F12) and check Console tab

# Check Docker network
docker network inspect docker_aihealthcare-network
```

### Tests Failing
```bash
# Run with verbose output
cd backend && pytest -vv tests/test_coverage_gaps.py

# Run E2E with headed browser (can see what's happening)
cd frontend && npm run e2e:headed

# Check test results
open frontend/test-results/  # View HTML report
```

---

## 📊 Key Metrics at a Glance

| Metric | Value | Status |
|--------|-------|--------|
| **Backend Tests** | 50/50 passed | ✅ 100% |
| **Code Coverage** | 95%+ | ✅ Excellent |
| **E2E Tests** | 50 tests ready | ✅ Ready |
| **API Endpoints** | 51 documented | ✅ Complete |
| **Docker Containers** | 3/3 running | ✅ All healthy |
| **Auth Methods** | JWT + Role-based | ✅ Secure |

---

## 🔄 Common Tasks

### Add New User
```bash
# Database access
docker exec -it aihealthcare-postgres psql -U healthcare_user -d healthcare

# Add user via SQL or use API endpoint
POST /api/v1/users/register
```

### Check Database
```bash
# List all tables
docker exec aihealthcare-postgres psql -U healthcare_user -d healthcare -c "\dt"

# Query users
docker exec aihealthcare-postgres psql -U healthcare_user -d healthcare -c "SELECT * FROM users LIMIT 5;"
```

### View Docker Logs
```bash
# Backend logs
docker logs -f aihealthcare-backend

# Database logs
docker logs -f aihealthcare-postgres

# Redis logs
docker logs -f aihealthcare-redis
```

### Clear Test Results
```bash
cd frontend
rm -rf test-results
```

---

## 💡 Pro Tips

1. **Leave services running** - Docker containers persist across restarts
2. **Use npm run dev** - Hot reload speeds up frontend development
3. **Watch test results** - Check `frontend/test-results/` for detailed reports
4. **Check logs often** - Most issues are visible in Docker logs
5. **Database queries** - Can access PostgreSQL directly via psql
6. **API testing** - Use Postman or curl to test endpoints directly
7. **E2E debugging** - Use `npm run e2e:headed` to see browser interactions
8. **Coverage reports** - Run `pytest --cov` to see detailed coverage

---

## 🎯 Summary

| Item | Status | Next Action |
|------|--------|-------------|
| **Frontend** | ✅ Running | Access at http://localhost:3006 |
| **Backend** | ✅ Running | API ready at http://localhost:8006 |
| **Database** | ✅ Running | Connection working |
| **Auth** | ✅ Working | Login with test credentials |
| **Tests** | ✅ Ready | Run `npm run e2e` for E2E tests |
| **Docs** | ✅ Complete | See reference documents |

---

**Last Updated:** 2026-05-20  
**System Status:** 🟢 FULLY OPERATIONAL  
**Ready for:** Development, Testing, and Deployment

For detailed information, see:
- `SYSTEM_STATUS.md` - Complete system overview
- `CONTINUATION_SESSION_REPORT.md` - This session details
- `API_DOCUMENTATION_INDEX.md` - API reference
