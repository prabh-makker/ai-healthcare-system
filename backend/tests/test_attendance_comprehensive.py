"""
Comprehensive test suite for attendance endpoints covering:
- Mark attendance (doctor only)
- Get attendance status
- View attendance logs
- Apply for leave
- Admin leave approval/rejection
- Admin attendance summary
- Holiday marking
"""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_user
from app.models.models import User, UserRole, Attendance, LeaveApplication
from datetime import datetime, timedelta
import uuid


def create_test_attendance(db, doctor_id, status="present", date=None):
    """Helper to create test attendance record"""
    if date is None:
        date = datetime.now().date()

    attendance = Attendance(
        id=str(uuid.uuid4()),
        doctor_id=str(doctor_id),
        date=date,
        status=status,
        notes="Test attendance",
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance


def create_test_leave_application(db, doctor_id, start_date, end_date, reason, status="pending"):
    """Helper to create test leave application"""
    leave = LeaveApplication(
        id=str(uuid.uuid4()),
        doctor_id=str(doctor_id),
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status=status,
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


# ============================================================================
# MARK ATTENDANCE TESTS
# ============================================================================

class TestMarkAttendance:
    """Tests for POST /api/v1/attendance/mark"""

    def test_doctor_marks_attendance_present(self, client: TestClient, db):
        """Test doctor can mark themselves present"""
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/mark", json={
            "status": "present",
            "notes": "On duty",
        })
        assert resp.status_code in [200, 201]
        data = resp.json()
        assert data["status"] == "present"
        assert data["doctor_id"] == str(doctor.id)

    def test_doctor_marks_attendance_absent(self, client: TestClient, db):
        """Test doctor can mark themselves absent"""
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/mark", json={
            "status": "absent",
            "notes": "Emergency",
        })
        assert resp.status_code in [200, 201]

    def test_patient_cannot_mark_attendance(self, client: TestClient, db):
        """Test patient cannot mark attendance"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/mark", json={
            "status": "present",
        })
        assert resp.status_code == 403

    def test_mark_attendance_requires_auth(self, client: TestClient):
        """Test marking attendance requires authentication"""
        resp = client.post("/api/v1/attendance/mark", json={
            "status": "present",
        })
        assert resp.status_code == 401

    def test_mark_attendance_invalid_status(self, client: TestClient, db):
        """Test invalid attendance status"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/mark", json={
            "status": "maybe_present",
        })
        assert resp.status_code == 422


# ============================================================================
# GET ATTENDANCE STATUS TESTS
# ============================================================================

class TestGetAttendanceStatus:
    """Tests for GET /api/v1/attendance/my-status"""

    def test_doctor_gets_own_status(self, client: TestClient, db):
        """Test doctor can get their attendance status"""
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        today = datetime.now().date()
        create_test_attendance(db, doctor.id, "present", today)

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/my-status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ["present", "absent", "on_leave"]
        assert data["doctor_id"] == str(doctor.id)

    def test_patient_cannot_get_attendance_status(self, client: TestClient, db):
        """Test patient cannot get attendance status"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/my-status")
        assert resp.status_code == 403

    def test_get_status_requires_auth(self, client: TestClient):
        """Test requires authentication"""
        resp = client.get("/api/v1/attendance/my-status")
        assert resp.status_code == 401

    def test_get_status_no_attendance_marked(self, client: TestClient, db):
        """Test getting status when no attendance marked today"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/my-status")
        # May return 404 or null status
        assert resp.status_code in [200, 404]


# ============================================================================
# GET ATTENDANCE LOGS TESTS
# ============================================================================

class TestAttendanceLogs:
    """Tests for GET /api/v1/attendance/logs"""

    def test_doctor_gets_own_logs(self, client: TestClient, db):
        """Test doctor can get their attendance logs"""
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        base_date = datetime.now().date()

        for i in range(5):
            date = base_date - timedelta(days=i)
            create_test_attendance(db, doctor.id, "present", date)

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/attendance/logs?month={base_date.month}&year={base_date.year}")
        assert resp.status_code == 200
        logs = resp.json()
        assert len(logs) >= 5

    def test_patient_cannot_get_logs(self, client: TestClient, db):
        """Test patient cannot get attendance logs"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/logs")
        assert resp.status_code == 403

    def test_logs_requires_auth(self, client: TestClient):
        """Test logs require authentication"""
        resp = client.get("/api/v1/attendance/logs")
        assert resp.status_code == 401

    def test_logs_with_invalid_month(self, client: TestClient, db):
        """Test logs with invalid month parameter"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/logs?month=13&year=2025")
        assert resp.status_code == 400


# ============================================================================
# APPLY FOR LEAVE TESTS
# ============================================================================

class TestApplyLeave:
    """Tests for POST /api/v1/attendance/apply-leave"""

    def test_doctor_applies_for_leave(self, client: TestClient, db):
        """Test doctor can apply for leave"""
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        start = (datetime.now() + timedelta(days=1)).date().isoformat()
        end = (datetime.now() + timedelta(days=5)).date().isoformat()

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/apply-leave", json={
            "start_date": start,
            "end_date": end,
            "reason": "Personal leave",
        })
        assert resp.status_code in [200, 201]
        data = resp.json()
        assert data["status"] == "pending"
        assert data["doctor_id"] == str(doctor.id)

    def test_patient_cannot_apply_leave(self, client: TestClient, db):
        """Test patient cannot apply for leave"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/apply-leave", json={
            "start_date": "2025-06-01",
            "end_date": "2025-06-05",
            "reason": "Vacation",
        })
        assert resp.status_code == 403

    def test_apply_leave_end_before_start(self, client: TestClient, db):
        """Test leave application with invalid dates"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/apply-leave", json={
            "start_date": "2025-06-05",
            "end_date": "2025-06-01",
            "reason": "Invalid dates",
        })
        assert resp.status_code == 400

    def test_apply_leave_requires_auth(self, client: TestClient):
        """Test apply leave requires authentication"""
        resp = client.post("/api/v1/attendance/apply-leave", json={
            "start_date": "2025-06-01",
            "end_date": "2025-06-05",
            "reason": "Vacation",
        })
        assert resp.status_code == 401

    def test_apply_leave_missing_fields(self, client: TestClient, db):
        """Test apply leave with missing fields"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/apply-leave", json={
            "start_date": "2025-06-01",
            # missing end_date
            "reason": "Vacation",
        })
        assert resp.status_code == 422


# ============================================================================
# GET LEAVE APPLICATIONS TESTS
# ============================================================================

class TestGetLeaveApplications:
    """Tests for GET /api/v1/attendance/leave-applications"""

    def test_doctor_gets_own_applications(self, client: TestClient, db):
        """Test doctor can get their leave applications"""
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        start = (datetime.now() + timedelta(days=1)).date()
        end = (datetime.now() + timedelta(days=5)).date()

        create_test_leave_application(db, doctor.id, start, end, "Vacation", "pending")
        create_test_leave_application(db, doctor.id, start, end, "Sick", "approved")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/leave-applications")
        assert resp.status_code == 200
        apps = resp.json()
        assert len(apps) >= 2

    def test_patient_cannot_get_applications(self, client: TestClient, db):
        """Test patient cannot get leave applications"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/leave-applications")
        assert resp.status_code == 403

    def test_get_applications_requires_auth(self, client: TestClient):
        """Test requires authentication"""
        resp = client.get("/api/v1/attendance/leave-applications")
        assert resp.status_code == 401


# ============================================================================
# ADMIN LEAVE DECISION TESTS
# ============================================================================

class TestAdminLeaveDecision:
    """Tests for POST /api/v1/attendance/admin/leave/{leave_id}/decision"""

    def test_admin_approves_leave(self, client: TestClient, db):
        """Test admin can approve leave application"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        start = (datetime.now() + timedelta(days=1)).date()
        end = (datetime.now() + timedelta(days=5)).date()
        leave = create_test_leave_application(db, doctor.id, start, end, "Vacation", "pending")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.post(f"/api/v1/attendance/admin/leave/{leave.id}/decision", json={
            "decision": "approved",
            "comments": "Approved",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"

    def test_admin_rejects_leave(self, client: TestClient, db):
        """Test admin can reject leave application"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        start = (datetime.now() + timedelta(days=1)).date()
        end = (datetime.now() + timedelta(days=5)).date()
        leave = create_test_leave_application(db, doctor.id, start, end, "Vacation", "pending")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.post(f"/api/v1/attendance/admin/leave/{leave.id}/decision", json={
            "decision": "rejected",
            "comments": "Not approved",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"

    def test_non_admin_cannot_decide_leave(self, client: TestClient, db):
        """Test non-admin cannot decide on leave"""
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        start = (datetime.now() + timedelta(days=1)).date()
        end = (datetime.now() + timedelta(days=5)).date()
        leave = create_test_leave_application(db, doctor.id, start, end, "Vacation", "pending")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post(f"/api/v1/attendance/admin/leave/{leave.id}/decision", json={
            "decision": "approved",
        })
        assert resp.status_code == 403

    def test_admin_decide_non_existent_leave(self, client: TestClient, db):
        """Test deciding on non-existent leave"""
        create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.post(f"/api/v1/attendance/admin/leave/{uuid.uuid4()}/decision", json={
            "decision": "approved",
        })
        assert resp.status_code == 404

    def test_admin_decide_already_decided(self, client: TestClient, db):
        """Test deciding on already approved/rejected leave"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")
        start = (datetime.now() + timedelta(days=1)).date()
        end = (datetime.now() + timedelta(days=5)).date()
        leave = create_test_leave_application(db, doctor.id, start, end, "Vacation", "approved")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.post(f"/api/v1/attendance/admin/leave/{leave.id}/decision", json={
            "decision": "rejected",
        })
        # May reject changing already decided or may allow
        assert resp.status_code in [400, 200]


# ============================================================================
# ADMIN ATTENDANCE SUMMARY TESTS
# ============================================================================

class TestAdminAttendanceSummary:
    """Tests for GET /api/v1/attendance/admin/all-doctors-summary"""

    def test_admin_views_all_doctors_summary(self, client: TestClient, db):
        """Test admin can view all doctors attendance summary"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor1 = create_test_user(db, "doctor1@test.com", "Test@1234", "DOCTOR")
        doctor2 = create_test_user(db, "doctor2@test.com", "Test@1234", "DOCTOR")

        today = datetime.now().date()
        create_test_attendance(db, doctor1.id, "present", today)
        create_test_attendance(db, doctor2.id, "absent", today)

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/admin/all-doctors-summary")
        assert resp.status_code == 200
        summary = resp.json()
        assert len(summary) >= 2

    def test_non_admin_cannot_view_summary(self, client: TestClient, db):
        """Test non-admin cannot view attendance summary"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/admin/all-doctors-summary")
        assert resp.status_code == 403


# ============================================================================
# ADMIN DOCTOR SPECIFIC TESTS
# ============================================================================

class TestAdminDoctorAttendance:
    """Tests for GET /api/v1/attendance/admin/doctor/{doctor_id}"""

    def test_admin_views_specific_doctor_attendance(self, client: TestClient, db):
        """Test admin can view specific doctor's attendance"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor = create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        today = datetime.now().date()
        create_test_attendance(db, doctor.id, "present", today)
        create_test_attendance(db, doctor.id, "absent", today - timedelta(days=1))

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/attendance/admin/doctor/{doctor.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 2

    def test_admin_views_non_existent_doctor(self, client: TestClient, db):
        """Test admin viewing non-existent doctor"""
        create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/attendance/admin/doctor/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_non_admin_cannot_view_other_doctor(self, client: TestClient, db):
        """Test non-admin cannot view other doctor's attendance"""
        doctor1 = create_test_user(db, "doctor1@test.com", "Test@1234", "DOCTOR")
        doctor2 = create_test_user(db, "doctor2@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor1@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/attendance/admin/doctor/{doctor2.id}")
        assert resp.status_code == 403


# ============================================================================
# ADMIN PENDING LEAVES TESTS
# ============================================================================

class TestAdminPendingLeaves:
    """Tests for GET /api/v1/attendance/admin/pending-leaves"""

    def test_admin_views_pending_leaves(self, client: TestClient, db):
        """Test admin can view all pending leave applications"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor1 = create_test_user(db, "doctor1@test.com", "Test@1234", "DOCTOR")
        doctor2 = create_test_user(db, "doctor2@test.com", "Test@1234", "DOCTOR")

        start = (datetime.now() + timedelta(days=1)).date()
        end = (datetime.now() + timedelta(days=5)).date()

        create_test_leave_application(db, doctor1.id, start, end, "Vacation", "pending")
        create_test_leave_application(db, doctor2.id, start, end, "Sick", "pending")
        create_test_leave_application(db, doctor1.id, start, end, "Other", "approved")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/admin/pending-leaves")
        assert resp.status_code == 200
        leaves = resp.json()
        assert len(leaves) >= 2
        # All should be pending
        for leave in leaves:
            assert leave["status"] == "pending"

    def test_non_admin_cannot_view_pending_leaves(self, client: TestClient, db):
        """Test non-admin cannot view pending leaves"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/attendance/admin/pending-leaves")
        assert resp.status_code == 403


# ============================================================================
# ADMIN MARK HOLIDAY TESTS
# ============================================================================

class TestAdminMarkHoliday:
    """Tests for POST /api/v1/attendance/admin/mark-holiday"""

    def test_admin_marks_holiday(self, client: TestClient, db):
        """Test admin can mark a holiday"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/admin/mark-holiday", json={
            "date": "2025-06-15",
            "holiday_name": "National Day",
        })
        assert resp.status_code in [200, 201]
        data = resp.json()
        assert data["holiday_name"] == "National Day"

    def test_non_admin_cannot_mark_holiday(self, client: TestClient, db):
        """Test non-admin cannot mark holiday"""
        create_test_user(db, "doctor@test.com", "Test@1234", "DOCTOR")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/attendance/admin/mark-holiday", json={
            "date": "2025-06-15",
            "holiday_name": "National Day",
        })
        assert resp.status_code == 403

    def test_mark_holiday_requires_auth(self, client: TestClient):
        """Test mark holiday requires authentication"""
        resp = client.post("/api/v1/attendance/admin/mark-holiday", json={
            "date": "2025-06-15",
            "holiday_name": "National Day",
        })
        assert resp.status_code == 401
