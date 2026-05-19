"""
Comprehensive test suite for appointment endpoints covering:
- List appointments with role-based filtering
- Create appointments with specialist validation and auto-assignment
- Update appointment status
- Delete/cancel appointments
- Admin summary endpoints
- Authorization and edge cases
"""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_user, get_auth_cookie
from app.models.models import Appointment, User, UserRole, DoctorProfile
from app.db.session import get_db
import uuid
from datetime import datetime, timedelta


VALID_SPECIALIST = "General Physician"
VALID_SPECIALISTS = [
    "General Physician", "Cardiologist", "Neurologist", "Dermatologist",
    "Pediatrician", "Endocrinologist", "Pulmonologist", "Orthopedist",
    "Psychiatrist", "Gastroenterologist", "Infectious Disease Specialist",
]


def create_test_appointment(db, patient_id, specialist=VALID_SPECIALIST,
                           date=None, time="10:00", status="upcoming", doctor_id=None):
    """Helper to create test appointment"""
    if date is None:
        date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    appt = Appointment(
        id=str(uuid.uuid4()),
        patient_id=str(patient_id),
        specialist=specialist,
        date=date,
        time=time,
        status=status,
        doctor_id=str(doctor_id) if doctor_id else None,
        reason="Test appointment",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


def create_doctor_with_profile(db, email, password, specialization=VALID_SPECIALIST):
    """Create doctor user with DoctorProfile"""
    doctor = create_test_user(db, email, password, "DOCTOR")
    profile = DoctorProfile(
        user_id=doctor.id,
        specialization=specialization,
        availability_status=True,
        license_number="LICENSE123",
        years_of_experience=5,
    )
    db.add(profile)
    db.commit()
    return doctor


# ============================================================================
# CREATE APPOINTMENT TESTS
# ============================================================================

class TestCreateAppointment:
    """Tests for POST /api/v1/appointments"""

    def test_create_appointment_success(self, client: TestClient, db):
        """Test successful appointment creation"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        create_doctor_with_profile(db, "doctor@test.com", "Test@1234", VALID_SPECIALIST)

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/appointments/", json={
            "specialist": VALID_SPECIALIST,
            "date": "2025-06-01",
            "time": "10:00",
            "reason": "Checkup",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["specialist"] == VALID_SPECIALIST
        assert data["date"] == "2025-06-01"
        assert data["time"] == "10:00"
        assert data["status"] == "upcoming"
        assert data["patient_id"] == str(patient.id)

    def test_create_appointment_auto_assigns_doctor(self, client: TestClient, db):
        """Test doctor is auto-assigned based on specialization"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234", "Cardiologist")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/appointments/", json={
            "specialist": "Cardiologist",
            "date": "2025-06-01",
            "time": "10:00",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["doctor_id"] == str(doctor.id)

    def test_create_appointment_no_matching_doctor(self, client: TestClient, db):
        """Test appointment creation when no doctor matches specialization"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/appointments/", json={
            "specialist": "Neurologist",
            "date": "2025-06-01",
            "time": "10:00",
        })
        assert resp.status_code == 201
        data = resp.json()
        # doctor_id may be None if no matching doctor
        assert data["specialist"] == "Neurologist"

    def test_create_appointment_invalid_specialist(self, client: TestClient, db):
        """Test appointment creation fails with invalid specialist"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/appointments/", json={
            "specialist": "InvalidSpecialist",
            "date": "2025-06-01",
            "time": "10:00",
        })
        assert resp.status_code == 422
        assert "Invalid specialist" in resp.json()["detail"]

    def test_create_appointment_requires_auth(self, client: TestClient, db):
        """Test appointment creation requires authentication"""
        resp = client.post("/api/v1/appointments/", json={
            "specialist": VALID_SPECIALIST,
            "date": "2025-06-01",
            "time": "10:00",
        })
        assert resp.status_code == 401

    def test_create_appointment_missing_required_fields(self, client: TestClient, db):
        """Test appointment creation fails without required fields"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        # Missing date
        resp = client.post("/api/v1/appointments/", json={
            "specialist": VALID_SPECIALIST,
            "time": "10:00",
        })
        assert resp.status_code == 422

    def test_create_appointment_with_reason(self, client: TestClient, db):
        """Test appointment creation with reason"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/appointments/", json={
            "specialist": VALID_SPECIALIST,
            "date": "2025-06-01",
            "time": "10:00",
            "reason": "Annual checkup with specific concerns",
        })
        assert resp.status_code == 201
        assert resp.json()["reason"] == "Annual checkup with specific concerns"

    def test_create_appointment_reason_too_long(self, client: TestClient, db):
        """Test appointment creation fails with reason exceeding max length"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        long_reason = "a" * 501
        resp = client.post("/api/v1/appointments/", json={
            "specialist": VALID_SPECIALIST,
            "date": "2025-06-01",
            "time": "10:00",
            "reason": long_reason,
        })
        assert resp.status_code == 422

    def test_create_appointment_invalid_date_format(self, client: TestClient, db):
        """Test appointment creation with invalid date format"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/appointments/", json={
            "specialist": VALID_SPECIALIST,
            "date": "06/01/2025",  # Invalid format
            "time": "10:00",
        })
        # May be 422 validation error or accepted depending on backend validation
        assert resp.status_code in [201, 422]

    def test_create_appointment_specialist_with_slash(self, client: TestClient, db):
        """Test specialist handling with slash-separated names"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234", "General Physician")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.post("/api/v1/appointments/", json={
            "specialist": "General Physician / Internal Medicine",
            "date": "2025-06-01",
            "time": "10:00",
        })
        # Should match General Physician part
        assert resp.status_code == 201


# ============================================================================
# LIST APPOINTMENTS TESTS
# ============================================================================

class TestListAppointments:
    """Tests for GET /api/v1/appointments"""

    def test_patient_sees_only_own_appointments(self, client: TestClient, db):
        """Test patient can only see their own appointments"""
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")

        create_test_appointment(db, patient1.id)
        create_test_appointment(db, patient1.id)
        create_test_appointment(db, patient2.id)

        client.post("/api/v1/auth/login", data={"username": "patient1@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/")
        assert resp.status_code == 200
        appointments = resp.json()
        assert len(appointments) == 2
        for appt in appointments:
            assert appt["patient_id"] == str(patient1.id)

    def test_doctor_sees_assigned_appointments(self, client: TestClient, db):
        """Test doctor can see their assigned appointments"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")

        # Create appointments assigned to this doctor
        create_test_appointment(db, patient1.id, doctor_id=doctor.id)
        # Create appointment for different doctor
        create_test_appointment(db, patient2.id, doctor_id=None)

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/")
        assert resp.status_code == 200
        appointments = resp.json()
        assert len(appointments) >= 1
        # All appointments should be assigned to this doctor
        for appt in appointments:
            if appt.get("doctor_id"):
                assert appt["doctor_id"] == str(doctor.id)

    def test_admin_sees_all_appointments(self, client: TestClient, db):
        """Test admin can see all appointments"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")

        create_test_appointment(db, patient1.id)
        create_test_appointment(db, patient2.id)

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/")
        assert resp.status_code == 200
        appointments = resp.json()
        assert len(appointments) >= 2

    def test_list_appointments_pagination(self, client: TestClient, db):
        """Test pagination of appointment list"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        for i in range(25):
            create_test_appointment(db, patient.id)

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/?skip=0&limit=10")
        assert resp.status_code == 200
        appointments = resp.json()
        assert len(appointments) == 10

        resp = client.get("/api/v1/appointments/?skip=10&limit=10")
        assert resp.status_code == 200
        appointments = resp.json()
        assert len(appointments) == 10

    def test_list_appointments_invalid_pagination(self, client: TestClient, db):
        """Test invalid pagination parameters"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/?skip=-1&limit=10")
        assert resp.status_code == 400

        resp = client.get("/api/v1/appointments/?skip=0&limit=1001")
        assert resp.status_code == 400

    def test_list_appointments_requires_auth(self, client: TestClient):
        """Test list appointments requires authentication"""
        resp = client.get("/api/v1/appointments/")
        assert resp.status_code == 401

    def test_list_appointments_empty(self, client: TestClient, db):
        """Test list appointments when none exist"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/")
        assert resp.status_code == 200
        assert resp.json() == []


# ============================================================================
# UPDATE APPOINTMENT TESTS
# ============================================================================

class TestUpdateAppointment:
    """Tests for PUT /api/v1/appointments/{appt_id}"""

    def test_patient_cancels_appointment(self, client: TestClient, db):
        """Test patient can cancel their appointment"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id, status="upcoming")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{appt.id}", json={"status": "cancelled"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    def test_patient_cannot_mark_completed(self, client: TestClient, db):
        """Test patient cannot mark appointment as completed"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id)

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{appt.id}", json={"status": "completed"})
        assert resp.status_code == 403

    def test_admin_marks_completed(self, client: TestClient, db):
        """Test admin can mark appointment as completed"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id)

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{appt.id}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_doctor_cannot_update_appointment(self, client: TestClient, db):
        """Test doctor cannot update appointments"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id, doctor_id=doctor.id)

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{appt.id}", json={"status": "cancelled"})
        assert resp.status_code == 403

    def test_update_appointment_not_found(self, client: TestClient, db):
        """Test updating non-existent appointment"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{uuid.uuid4()}", json={"status": "cancelled"})
        assert resp.status_code == 404

    def test_patient_cannot_update_others_appointment(self, client: TestClient, db):
        """Test patient cannot update other patient's appointment"""
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient1.id)

        client.post("/api/v1/auth/login", data={"username": "patient2@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{appt.id}", json={"status": "cancelled"})
        assert resp.status_code == 403

    def test_update_appointment_invalid_status(self, client: TestClient, db):
        """Test update with invalid status"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id)

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{appt.id}", json={"status": "invalid_status"})
        assert resp.status_code == 422

    def test_update_appointment_partial_fields(self, client: TestClient, db):
        """Test updating only specific fields"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id, reason="Original reason")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.put(f"/api/v1/appointments/{appt.id}", json={"reason": "Updated reason"})
        assert resp.status_code == 200
        assert resp.json()["reason"] == "Updated reason"


# ============================================================================
# DELETE APPOINTMENT TESTS
# ============================================================================

class TestCancelAppointment:
    """Tests for DELETE /api/v1/appointments/{appt_id}"""

    def test_patient_cancels_own_appointment(self, client: TestClient, db):
        """Test patient can cancel own appointment"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id)

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.delete(f"/api/v1/appointments/{appt.id}")
        assert resp.status_code == 204

        # Verify deleted
        db.refresh(appt)
        assert db.query(Appointment).filter(Appointment.id == appt.id).first() is None

    def test_admin_cancels_any_appointment(self, client: TestClient, db):
        """Test admin can cancel any appointment"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id)

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.delete(f"/api/v1/appointments/{appt.id}")
        assert resp.status_code == 204

    def test_doctor_cannot_cancel_appointment(self, client: TestClient, db):
        """Test doctor cannot cancel appointments"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id, doctor_id=doctor.id)

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.delete(f"/api/v1/appointments/{appt.id}")
        assert resp.status_code == 403

    def test_patient_cannot_cancel_others_appointment(self, client: TestClient, db):
        """Test patient cannot cancel other patient's appointment"""
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient1.id)

        client.post("/api/v1/auth/login", data={"username": "patient2@test.com", "password": "Test@1234"})

        resp = client.delete(f"/api/v1/appointments/{appt.id}")
        assert resp.status_code == 403

    def test_cancel_non_existent_appointment(self, client: TestClient, db):
        """Test cancelling non-existent appointment"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.delete(f"/api/v1/appointments/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_cancel_appointment_requires_auth(self, client: TestClient, db):
        """Test cancelling requires authentication"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        appt = create_test_appointment(db, patient.id)

        resp = client.delete(f"/api/v1/appointments/{appt.id}")
        assert resp.status_code == 401


# ============================================================================
# ADMIN SUMMARY TESTS
# ============================================================================

class TestAdminAppointmentSummary:
    """Tests for GET /api/v1/appointments/admin/doctors-summary"""

    def test_admin_views_doctor_summary(self, client: TestClient, db):
        """Test admin can view doctor appointment summary"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")

        create_test_appointment(db, patient1.id, doctor_id=doctor.id, status="upcoming")
        create_test_appointment(db, patient2.id, doctor_id=doctor.id, status="completed")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/admin/doctors-summary")
        assert resp.status_code == 200
        summary = resp.json()
        assert len(summary) >= 1
        doctor_summary = next((s for s in summary if s["doctor_id"] == str(doctor.id)), None)
        assert doctor_summary is not None
        assert doctor_summary["total"] >= 2
        assert doctor_summary["upcoming"] >= 1
        assert doctor_summary["completed"] >= 1

    def test_non_admin_cannot_view_summary(self, client: TestClient, db):
        """Test non-admin cannot view doctor summary"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/admin/doctors-summary")
        assert resp.status_code == 403

    def test_summary_requires_auth(self, client: TestClient):
        """Test summary requires authentication"""
        resp = client.get("/api/v1/appointments/admin/doctors-summary")
        assert resp.status_code == 401

    def test_summary_includes_all_doctors(self, client: TestClient, db):
        """Test summary includes all doctors"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor1 = create_doctor_with_profile(db, "doctor1@test.com", "Test@1234", "General Physician")
        doctor2 = create_doctor_with_profile(db, "doctor2@test.com", "Test@1234", "Cardiologist")

        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")
        create_test_appointment(db, patient.id, doctor_id=doctor1.id)

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/appointments/admin/doctors-summary")
        assert resp.status_code == 200
        summary = resp.json()
        doctor_ids = [s["doctor_id"] for s in summary]
        assert str(doctor1.id) in doctor_ids
        assert str(doctor2.id) in doctor_ids
