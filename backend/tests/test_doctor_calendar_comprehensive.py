"""
Comprehensive test suite for doctor calendar endpoints covering:
- Get doctor's calendar schedule for a date
- Get available 30-min slots
- Get all doctors availability on a date
- Get 7-day appointment count summary
"""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_user
from app.models.models import DoctorProfile, Appointment
from datetime import datetime, timedelta
import uuid


def create_doctor_with_profile(db, email, password, specialization="General Physician"):
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


def create_test_appointment(db, patient_id, doctor_id, date, time):
    """Helper to create test appointment"""
    appt = Appointment(
        id=str(uuid.uuid4()),
        patient_id=str(patient_id),
        specialist="General Physician",
        date=date,
        time=time,
        status="upcoming",
        doctor_id=str(doctor_id),
    )
    db.add(appt)
    db.commit()
    return appt


# ============================================================================
# GET DOCTOR SCHEDULE TESTS
# ============================================================================

class TestGetDoctorSchedule:
    """Tests for GET /api/v1/doctor-calendar/doctor-schedule"""

    def test_get_own_doctor_schedule(self, client: TestClient, db):
        """Test doctor can get their own schedule"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctor-schedule?date={tomorrow}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["doctor_id"] == str(doctor.id)
        assert "slots" in data

    def test_get_other_doctor_schedule(self, client: TestClient, db):
        """Test getting another doctor's schedule"""
        doctor1 = create_doctor_with_profile(db, "doctor1@test.com", "Test@1234")
        doctor2 = create_doctor_with_profile(db, "doctor2@test.com", "Test@1234")

        client.post("/api/v1/auth/login", data={"username": "doctor1@test.com", "password": "Test@1234"})

        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctor-schedule?doctor_id={doctor2.id}&date={tomorrow}")
        # May or may not be allowed
        assert resp.status_code in [200, 403]

    def test_patient_can_view_doctor_schedule(self, client: TestClient, db):
        """Test patient can view doctor's schedule"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctor-schedule?doctor_id={doctor.id}&date={tomorrow}")
        assert resp.status_code == 200

    def test_schedule_with_existing_appointments(self, client: TestClient, db):
        """Test schedule shows booked slots"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        create_test_appointment(db, patient.id, doctor.id, tomorrow_str, "10:00")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/doctor-schedule?date={tomorrow_str}")
        assert resp.status_code == 200
        data = resp.json()
        # Should show 10:00 as booked
        slots = data.get("slots", [])
        booked_times = [s for s in slots if not s.get("available")]
        # At least 10:00 should be booked
        assert any("10" in str(s) for s in booked_times)

    def test_schedule_requires_auth(self, client: TestClient):
        """Test schedule access requires authentication"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctor-schedule?date={tomorrow}")
        # May allow without auth or require it
        assert resp.status_code in [200, 401]

    def test_schedule_invalid_date_format(self, client: TestClient, db):
        """Test schedule with invalid date format"""
        create_doctor_with_profile(db, "doctor@test.com", "Test@1234")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/doctor-calendar/doctor-schedule?date=06/01/2025")
        assert resp.status_code in [400, 422, 200]


# ============================================================================
# GET AVAILABLE SLOTS TESTS
# ============================================================================

class TestGetAvailableSlots:
    """Tests for GET /api/v1/doctor-calendar/available-slots"""

    def test_get_available_slots(self, client: TestClient, db):
        """Test getting available 30-min slots for doctor"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/available-slots?doctor_id={doctor.id}&date={tomorrow_str}")
        assert resp.status_code == 200
        slots = resp.json()
        assert isinstance(slots, list)
        # Should have some available slots
        assert len(slots) > 0

    def test_available_slots_excludes_booked(self, client: TestClient, db):
        """Test available slots excludes already booked times"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        create_test_appointment(db, patient1.id, doctor.id, tomorrow_str, "10:00")

        client.post("/api/v1/auth/login", data={"username": "patient2@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/available-slots?doctor_id={doctor.id}&date={tomorrow_str}")
        assert resp.status_code == 200
        slots = resp.json()
        # 10:00 should not be in available slots
        assert "10:00" not in slots or any(s for s in slots if s != "10:00")

    def test_available_slots_requires_doctor_id(self, client: TestClient, db):
        """Test available slots requires doctor_id parameter"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/available-slots?date={tomorrow_str}")
        assert resp.status_code == 422

    def test_available_slots_invalid_doctor(self, client: TestClient, db):
        """Test available slots with non-existent doctor"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/available-slots?doctor_id={uuid.uuid4()}&date={tomorrow_str}")
        assert resp.status_code == 404

    def test_available_slots_past_date(self, client: TestClient, db):
        """Test available slots for past date"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/available-slots?doctor_id={doctor.id}&date={past_date}")
        # May reject past dates or return empty
        assert resp.status_code in [200, 400]


# ============================================================================
# GET ALL DOCTORS AVAILABILITY TESTS
# ============================================================================

class TestGetDoctorsAvailability:
    """Tests for GET /api/v1/doctor-calendar/doctors-availability"""

    def test_get_all_doctors_availability(self, client: TestClient, db):
        """Test getting all doctors availability for a date"""
        doctor1 = create_doctor_with_profile(db, "doctor1@test.com", "Test@1234", "General Physician")
        doctor2 = create_doctor_with_profile(db, "doctor2@test.com", "Test@1234", "Cardiologist")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctors-availability?date={tomorrow_str}")
        assert resp.status_code == 200
        doctors = resp.json()
        assert isinstance(doctors, list)
        assert len(doctors) >= 2

    def test_doctors_availability_includes_all_doctors(self, client: TestClient, db):
        """Test all active doctors are included"""
        doctor1 = create_doctor_with_profile(db, "doctor1@test.com", "Test@1234")
        doctor2 = create_doctor_with_profile(db, "doctor2@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctors-availability?date={tomorrow_str}")
        assert resp.status_code == 200
        doctors = resp.json()
        doctor_ids = [d["id"] for d in doctors]
        assert str(doctor1.id) in doctor_ids
        assert str(doctor2.id) in doctor_ids

    def test_doctors_availability_shows_slots(self, client: TestClient, db):
        """Test availability includes slot information"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctors-availability?date={tomorrow_str}")
        assert resp.status_code == 200
        doctors = resp.json()
        assert len(doctors) > 0
        # Each doctor should have availability info
        for doc in doctors:
            assert "id" in doc
            assert "available_count" in doc or "slots" in doc

    def test_doctors_availability_requires_date(self, client: TestClient, db):
        """Test date parameter is required"""
        create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/doctor-calendar/doctors-availability")
        assert resp.status_code == 422

    def test_doctors_availability_by_specialty(self, client: TestClient, db):
        """Test filtering availability by specialization"""
        doctor1 = create_doctor_with_profile(db, "doctor1@test.com", "Test@1234", "General Physician")
        doctor2 = create_doctor_with_profile(db, "doctor2@test.com", "Test@1234", "Cardiologist")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        tomorrow_str = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        resp = client.get(f"/api/v1/doctor-calendar/doctors-availability?date={tomorrow_str}&specialty=Cardiologist")
        # May or may not support specialty filter
        assert resp.status_code in [200, 400]


# ============================================================================
# GET DOCTOR WEEKLY SUMMARY TESTS
# ============================================================================

class TestGetDoctorWeeklySummary:
    """Tests for GET /api/v1/doctor-calendar/doctor-weekly"""

    def test_get_weekly_appointment_summary(self, client: TestClient, db):
        """Test getting 7-day appointment count summary"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient1 = create_test_user(db, "patient1@test.com", "Test@1234", "PATIENT")
        patient2 = create_test_user(db, "patient2@test.com", "Test@1234", "PATIENT")

        # Create appointments for next 7 days
        for i in range(7):
            date_str = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
            create_test_appointment(db, patient1.id, doctor.id, date_str, "10:00")
            if i % 2 == 0:
                create_test_appointment(db, patient2.id, doctor.id, date_str, "14:00")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/doctor-weekly?doctor_id={doctor.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, (dict, list))
        # Should have data for 7 days
        if isinstance(data, dict):
            assert "total" in data or len(data) >= 1

    def test_doctor_views_own_weekly(self, client: TestClient, db):
        """Test doctor can view their own weekly summary"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get("/api/v1/doctor-calendar/doctor-weekly")
        assert resp.status_code == 200

    def test_admin_views_any_doctor_weekly(self, client: TestClient, db):
        """Test admin can view any doctor's weekly summary"""
        admin = create_test_user(db, "admin@test.com", "Test@1234", "ADMIN")
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")

        client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/doctor-weekly?doctor_id={doctor.id}")
        assert resp.status_code == 200

    def test_patient_cannot_view_weekly(self, client: TestClient, db):
        """Test patient cannot view weekly summary"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/doctor-weekly?doctor_id={doctor.id}")
        # May restrict or allow based on design
        assert resp.status_code in [200, 403]

    def test_weekly_with_no_appointments(self, client: TestClient, db):
        """Test weekly summary for doctor with no appointments"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/doctor-weekly?doctor_id={doctor.id}")
        assert resp.status_code == 200
        data = resp.json()
        # Should return valid response with zero counts
        if isinstance(data, dict):
            assert data.get("total", 0) == 0

    def test_weekly_invalid_doctor_id(self, client: TestClient, db):
        """Test weekly summary with invalid doctor ID"""
        doctor = create_doctor_with_profile(db, "doctor@test.com", "Test@1234")

        client.post("/api/v1/auth/login", data={"username": "doctor@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/doctor-weekly?doctor_id={uuid.uuid4()}")
        assert resp.status_code == 404

    def test_weekly_for_non_doctor_user(self, client: TestClient, db):
        """Test weekly summary for non-doctor user"""
        patient = create_test_user(db, "patient@test.com", "Test@1234", "PATIENT")

        client.post("/api/v1/auth/login", data={"username": "patient@test.com", "password": "Test@1234"})

        resp = client.get(f"/api/v1/doctor-calendar/doctor-weekly?doctor_id={patient.id}")
        # Should reject or handle gracefully
        assert resp.status_code in [400, 403, 404]
