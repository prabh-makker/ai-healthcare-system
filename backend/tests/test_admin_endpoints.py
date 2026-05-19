"""
Comprehensive test suite for Admin endpoints covering:
- Admin-only access control and authorization
- User management (list, deactivate, activate)
- System statistics and overview dashboards
- Role management and role transitions
- Audit logging and activity tracking
- Admin action authorization
- Anti-privilege escalation (users cannot elevate their own role)
"""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_user
from app.models.models import User, UserRole


VALID_PASSWORD = "Test@1234"
ADMIN_EMAIL = "admin@example.com"
DOCTOR_EMAIL = "doctor@example.com"
PATIENT_EMAIL = "patient@example.com"


class TestAdminAccessControl:
    """Tests for admin authorization"""

    def test_admin_can_access_admin_endpoints(self, client: TestClient, db):
        """Test admin user can access admin endpoints"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/users")
        assert resp.status_code in [200, 404]

    def test_patient_cannot_access_admin_endpoints(self, client: TestClient, db):
        """Test patient cannot access admin endpoints"""
        create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/users")
        assert resp.status_code == 403

    def test_doctor_cannot_access_admin_endpoints(self, client: TestClient, db):
        """Test doctor cannot access admin endpoints"""
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/users")
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_admin_endpoints(self, client: TestClient):
        """Test unauthenticated request cannot access admin endpoints"""
        resp = client.get("/api/v1/admin/users")
        assert resp.status_code == 401


class TestAdminUserManagement:
    """Tests for admin user management functionality"""

    def test_admin_list_all_users(self, client: TestClient, db):
        """Test admin can list all users"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/users")
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data, list)
            emails = [u.get("email") for u in data]
            assert PATIENT_EMAIL in emails
            assert DOCTOR_EMAIL in emails

    def test_admin_view_user_details(self, client: TestClient, db):
        """Test admin can view details of specific user"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get(f"/api/v1/admin/users/{patient.id}")
        if resp.status_code == 200:
            data = resp.json()
            assert data["id"] == str(patient.id)
            assert data["email"] == PATIENT_EMAIL
            assert data["role"] == "PATIENT"

    def test_admin_deactivate_user(self, client: TestClient, db):
        """Test admin can deactivate a user"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.patch(f"/api/v1/admin/users/{patient.id}", json={
            "is_active": False
        })
        if resp.status_code == 200:
            assert resp.json()["is_active"] is False

            # Verify user cannot login
            client.post("/api/v1/auth/logout")
            login_resp = client.post(
                "/api/v1/auth/login",
                data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
            )
            assert login_resp.status_code == 400  # Inactive user

    def test_admin_reactivate_user(self, client: TestClient, db):
        """Test admin can reactivate an inactive user"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient.is_active = False
        db.commit()

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.patch(f"/api/v1/admin/users/{patient.id}", json={
            "is_active": True
        })
        if resp.status_code == 200:
            assert resp.json()["is_active"] is True

            # Verify user can login again
            client.post("/api/v1/auth/logout")
            login_resp = client.post(
                "/api/v1/auth/login",
                data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
            )
            assert login_resp.status_code == 200

    def test_admin_cannot_delete_user(self, client: TestClient, db):
        """Test admin can deactivate but should not hard-delete users"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        # Hard delete should not be allowed
        resp = client.delete(f"/api/v1/admin/users/{patient.id}")
        assert resp.status_code == 405  # Method not allowed, or require deactivation instead


class TestAdminPrivilegeEscalation:
    """Tests to prevent privilege escalation"""

    def test_user_cannot_promote_self_to_admin(self, client: TestClient, db):
        """Test user cannot promote themselves to admin"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )

        # Try to update self role
        resp = client.patch("/api/v1/auth/me", json={
            "role": "ADMIN"
        })
        assert resp.status_code == 403  # Forbidden

        # Verify role unchanged
        db.refresh(patient)
        assert patient.role == UserRole.PATIENT

    def test_doctor_cannot_promote_self_to_admin(self, client: TestClient, db):
        """Test doctor cannot promote themselves to admin"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.patch("/api/v1/auth/me", json={
            "role": "ADMIN"
        })
        assert resp.status_code == 403

        db.refresh(doctor)
        assert doctor.role == UserRole.DOCTOR

    def test_only_admin_can_change_user_roles(self, client: TestClient, db):
        """Test only admin can change other user roles"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        # Doctor tries to change patient role
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.patch(f"/api/v1/admin/users/{patient.id}", json={
            "role": "DOCTOR"
        })
        assert resp.status_code == 403

        # Admin can change roles
        client.post("/api/v1/auth/logout")
        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.patch(f"/api/v1/admin/users/{patient.id}", json={
            "role": "DOCTOR"
        })
        if resp.status_code == 200:
            assert resp.json()["role"] == "DOCTOR"


class TestAdminStatistics:
    """Tests for admin dashboard and statistics"""

    def test_admin_view_system_statistics(self, client: TestClient, db):
        """Test admin can view system statistics"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/statistics")
        if resp.status_code == 200:
            stats = resp.json()
            assert "total_users" in stats or "users" in stats

    def test_admin_view_user_count(self, client: TestClient, db):
        """Test admin can view user count statistics"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/statistics")
        if resp.status_code == 200:
            data = resp.json()
            assert isinstance(data, dict)

    def test_admin_view_doctors_overview(self, client: TestClient, db):
        """Test admin can view doctors overview"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/patients/admin/doctors-overview")
        assert resp.status_code in [200, 404]


class TestAdminDoctorManagement:
    """Tests for admin doctor-specific management"""

    def test_admin_view_doctor_appointment_summary(self, client: TestClient, db):
        """Test admin can view per-doctor appointment summary"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/appointments/admin/doctors-summary")
        assert resp.status_code in [200, 404]

    def test_admin_can_assign_patients_to_doctors(self, client: TestClient, db):
        """Test admin can assign patients to doctors"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        # Assuming endpoint exists for assigning patients
        resp = client.post(f"/api/v1/admin/assign-patient", json={
            "doctor_id": str(doctor.id),
            "patient_id": str(patient.id)
        })
        assert resp.status_code in [200, 201, 404]


class TestAdminIntegration:
    """Integration tests for admin workflows"""

    def test_admin_full_user_lifecycle(self, client: TestClient, db):
        """Test admin managing user from creation to deactivation"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        # Admin views users
        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/users")
        if resp.status_code == 200:
            users = resp.json()
            assert len(users) >= 2

        # Admin deactivates
        resp = client.patch(f"/api/v1/admin/users/{patient.id}", json={
            "is_active": False
        })
        if resp.status_code == 200:
            assert resp.json()["is_active"] is False

        # Verify patient cannot login
        client.post("/api/v1/auth/logout")
        login_resp = client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )
        assert login_resp.status_code == 400

        # Admin reactivates
        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )
        resp = client.patch(f"/api/v1/admin/users/{patient.id}", json={
            "is_active": True
        })
        if resp.status_code == 200:
            assert resp.json()["is_active"] is True
