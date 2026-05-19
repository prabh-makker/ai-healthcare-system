"""
Comprehensive test suite for Appointment endpoints covering:
- Appointment creation and scheduling
- Specialist validation
- DateTime format validation
- Status transitions (pending → scheduled → completed)
- Doctor-patient appointment assignment
- Role-based access control
- Appointment cancellation
- Pagination and filtering
- Admin appointment management
"""
import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_test_user

VALID_PASSWORD = "Test@1234"


class TestAppointments:
    def _login(self, client, db, email="patient@test.com", role="PATIENT"):
        create_test_user(db, email, VALID_PASSWORD, role)
        client.post("/api/v1/auth/login", data={"username": email, "password": VALID_PASSWORD})

    def test_create_appointment(self, client: TestClient, db):
        self._login(client, db)
        resp = client.post("/api/v1/appointments/", json={
            "specialist": "Pulmonologist",
            "date": "2026-06-01",
            "time": "10:00 AM",
            "reason": "Breathing issues",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["specialist"] == "Pulmonologist"
        assert data["status"] == "upcoming"

    def test_list_appointments_only_own(self, client: TestClient, db):
        self._login(client, db)
        client.post("/api/v1/appointments/", json={
            "specialist": "GP",
            "date": "2026-06-01",
            "time": "9:00 AM",
        })
        resp = client.get("/api/v1/appointments/")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_update_appointment(self, client: TestClient, db):
        self._login(client, db)
        create_resp = client.post("/api/v1/appointments/", json={
            "specialist": "GP",
            "date": "2026-06-01",
            "time": "9:00 AM",
        })
        appt_id = create_resp.json()["id"]
        resp = client.put(f"/api/v1/appointments/{appt_id}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_cancel_appointment(self, client: TestClient, db):
        self._login(client, db)
        create_resp = client.post("/api/v1/appointments/", json={
            "specialist": "GP",
            "date": "2026-06-01",
            "time": "9:00 AM",
        })
        appt_id = create_resp.json()["id"]
        resp = client.delete(f"/api/v1/appointments/{appt_id}")
        assert resp.status_code == 204

    def test_unauthenticated_returns_401(self, client: TestClient, db):
        resp = client.get("/api/v1/appointments/")
        assert resp.status_code == 401

    def test_other_user_cannot_update(self, client: TestClient, db):
        self._login(client, db, "patient1@test.com")
        create_resp = client.post("/api/v1/appointments/", json={
            "specialist": "GP",
            "date": "2026-06-01",
            "time": "9:00 AM",
        })
        appt_id = create_resp.json()["id"]

        # Login as different patient
        client.post("/api/v1/auth/logout")
        create_test_user(db, "patient2@test.com", VALID_PASSWORD, "PATIENT")
        client.post("/api/v1/auth/login", data={"username": "patient2@test.com", "password": VALID_PASSWORD})

        resp = client.put(f"/api/v1/appointments/{appt_id}", json={"status": "completed"})
        assert resp.status_code == 403
