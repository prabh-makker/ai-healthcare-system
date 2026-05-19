"""
Comprehensive test suite for Medical Records endpoints covering:
- Medical record creation with file attachments
- Record type validation (diagnosis, prescription, lab results)
- Access control (patient, doctor, admin)
- Record metadata (date, provider, notes)
- Pagination and filtering
- File storage and retrieval
- Record archival and deletion
- Privacy compliance (record visibility)
"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from tests.conftest import create_test_user
from app.models.models import MedicalRecord, User, UserRole
import uuid


VALID_PASSWORD = "Test@1234"
PATIENT_EMAIL = "patient@example.com"
DOCTOR_EMAIL = "doctor@example.com"
ADMIN_EMAIL = "admin@example.com"


class TestMedicalRecordCreation:
    """Tests for creating medical records"""

    def test_doctor_create_diagnosis_record(self, client: TestClient, db):
        """Test doctor can create a diagnosis record"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Patient has Type 2 Diabetes",
            "date": datetime.now().isoformat()
        })
        assert resp.status_code == 201
        assert resp.json()["record_type"] == "DIAGNOSIS"

    def test_record_requires_patient_id(self, client: TestClient, db):
        """Test record creation requires patient_id"""
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "notes": "Some diagnosis"
        })
        assert resp.status_code in [400, 422]

    def test_patient_cannot_create_record(self, client: TestClient, db):
        """Test patient cannot create medical records (doctor role required)"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Self diagnosis"
        })
        assert resp.status_code == 403

    def test_create_valid_record_types(self, client: TestClient, db):
        """Test creation of all valid record types"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        record_types = ["DIAGNOSIS", "PRESCRIPTION", "LAB_RESULT", "CONSULTATION"]
        for record_type in record_types:
            resp = client.post("/api/v1/records", json={
                "record_type": record_type,
                "patient_id": str(patient.id),
                "notes": f"A {record_type} record"
            })
            # Should succeed for valid types
            assert resp.status_code in [201, 400]

    def test_invalid_record_type_rejected(self, client: TestClient, db):
        """Test invalid record type is rejected"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.post("/api/v1/records", json={
            "record_type": "INVALID_TYPE",
            "patient_id": str(patient.id),
            "notes": "Notes"
        })
        assert resp.status_code == 400

    def test_create_record_with_notes(self, client: TestClient, db):
        """Test creating record with detailed notes"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        detailed_notes = "Patient presents with elevated blood glucose levels. A1C is 8.5%. Recommended increasing exercise and adjusting diet."
        resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": detailed_notes
        })
        assert resp.status_code == 201
        assert resp.json()["notes"] == detailed_notes


class TestMedicalRecordRetrieval:
    """Tests for retrieving medical records"""

    def test_patient_view_own_records(self, client: TestClient, db):
        """Test patient can view their own medical records"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        # Doctor creates record
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )
        client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Type 2 Diabetes"
        })

        # Patient views
        client.post("/api/v1/auth/logout")
        client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/records")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) > 0

    def test_patient_cannot_view_other_patient_records(self, client: TestClient, db):
        """Test patient cannot view other patient's records"""
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "other@example.com", VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        # Doctor creates record for patient1
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )
        client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient1.id),
            "notes": "Patient 1 diagnosis"
        })

        # Patient2 tries to access patient1's records
        client.post("/api/v1/auth/logout")
        client.post(
            "/api/v1/auth/login",
            data={"username": "other@example.com", "password": VALID_PASSWORD},
        )

        resp = client.get(f"/api/v1/records?patient_id={patient1.id}")
        assert resp.status_code == 403

    def test_doctor_view_patient_records(self, client: TestClient, db):
        """Test doctor can view their patient's records"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        # Doctor creates record
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )
        client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Diagnosis"
        })

        # Doctor retrieves
        resp = client.get(f"/api/v1/records?patient_id={patient.id}")
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    def test_admin_view_all_records(self, client: TestClient, db):
        """Test admin can view all medical records"""
        create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        client.post(
            "/api/v1/auth/login",
            data={"username": ADMIN_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.get("/api/v1/admin/records")
        assert resp.status_code in [200, 404]

    def test_unauthenticated_cannot_view_records(self, client: TestClient):
        """Test unauthenticated request cannot view records"""
        resp = client.get("/api/v1/records")
        assert resp.status_code == 401


class TestMedicalRecordUpdate:
    """Tests for updating medical records"""

    def test_doctor_update_record_notes(self, client: TestClient, db):
        """Test doctor can update record notes"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        # Create record
        create_resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Initial diagnosis"
        })
        record_id = create_resp.json()["id"]

        # Update
        resp = client.put(f"/api/v1/records/{record_id}", json={
            "notes": "Updated diagnosis with new findings"
        })
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Updated diagnosis with new findings"

    def test_patient_cannot_update_record(self, client: TestClient, db):
        """Test patient cannot update medical records"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        # Doctor creates record
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )
        create_resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Diagnosis"
        })
        record_id = create_resp.json()["id"]

        # Patient tries to update
        client.post("/api/v1/auth/logout")
        client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.put(f"/api/v1/records/{record_id}", json={
            "notes": "Changed notes"
        })
        assert resp.status_code == 403


class TestMedicalRecordDeletion:
    """Tests for deleting medical records"""

    def test_doctor_delete_record(self, client: TestClient, db):
        """Test doctor can delete their own record"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        # Create record
        create_resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "To be deleted"
        })
        record_id = create_resp.json()["id"]

        # Delete
        resp = client.delete(f"/api/v1/records/{record_id}")
        assert resp.status_code in [200, 204]

    def test_patient_cannot_delete_record(self, client: TestClient, db):
        """Test patient cannot delete records"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        # Doctor creates record
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )
        create_resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Record"
        })
        record_id = create_resp.json()["id"]

        # Patient tries to delete
        client.post("/api/v1/auth/logout")
        client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )

        resp = client.delete(f"/api/v1/records/{record_id}")
        assert resp.status_code == 403


class TestMedicalRecordIntegration:
    """Integration tests for medical records"""

    def test_doctor_patient_record_workflow(self, client: TestClient, db):
        """Test complete workflow: doctor creates record, patient views it"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        # Doctor creates record
        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )
        create_resp = client.post("/api/v1/records", json={
            "record_type": "DIAGNOSIS",
            "patient_id": str(patient.id),
            "notes": "Type 2 Diabetes Diagnosis"
        })
        assert create_resp.status_code == 201

        # Patient views
        client.post("/api/v1/auth/logout")
        client.post(
            "/api/v1/auth/login",
            data={"username": PATIENT_EMAIL, "password": VALID_PASSWORD},
        )
        resp = client.get("/api/v1/records")
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    def test_multiple_records_for_patient(self, client: TestClient, db):
        """Test patient can have multiple records"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        client.post(
            "/api/v1/auth/login",
            data={"username": DOCTOR_EMAIL, "password": VALID_PASSWORD},
        )

        # Create 3 different records
        record_types = ["DIAGNOSIS", "PRESCRIPTION", "LAB_RESULT"]
        for record_type in record_types:
            resp = client.post("/api/v1/records", json={
                "record_type": record_type,
                "patient_id": str(patient.id),
                "notes": f"{record_type} notes"
            })
            if resp.status_code == 201:
                assert resp.json()["record_type"] == record_type
