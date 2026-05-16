"""
Comprehensive test suite for Medical Records endpoint covering:
- CRUD operations (create, read, update, delete)
- Role-based access control (patient, doctor, admin)
- Authorization checks (record ownership, modification rights)
- Pagination and filtering
- Bulk operations (bulk approve)
- Status validation
- Edge cases and error handling
"""
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.conftest import create_test_user
from app.models.models import User, MedicalRecord, UserRole
from app.core.constants import RECORD_STATUS_ALLOWED


# Test data constants
VALID_PASSWORD = "Test@1234"
PATIENT_EMAIL = "patient@example.com"
DOCTOR_EMAIL = "doctor@example.com"
DOCTOR_EMAIL_2 = "doctor2@example.com"
ADMIN_EMAIL = "admin@example.com"

SAMPLE_RECORD_DATA = {
    "symptoms": ["fever", "cough", "headache"],
    "ai_prediction": "Common Cold",
    "confidence_score": 0.85,
    "recommended_specialist": "General Physician",
}


def get_error_detail(resp_json: dict) -> str:
    """Extract error message from response (handles both formats)."""
    if isinstance(resp_json, dict):
        if "error" in resp_json and isinstance(resp_json["error"], dict):
            return resp_json["error"].get("message", "")
        if "detail" in resp_json:
            return resp_json.get("detail", "")
    return ""


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_record_in_db(
    db: Session,
    patient_id: str,
    doctor_id: str = None,
    symptoms: list = None,
    status: str = "pending",
) -> MedicalRecord:
    """Helper to create a medical record in the database."""
    record = MedicalRecord(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        doctor_id=doctor_id,
        symptoms=symptoms or ["fever", "cough"],
        ai_prediction="Test Prediction",
        confidence_score=0.8,
        status=status,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def login_user(client: TestClient, email: str, password: str) -> None:
    """Helper to login a user and set cookies."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200


# ============================================================================
# TEST: GET /test-simple
# ============================================================================

class TestSimpleEndpoint:
    """Test the simple test endpoint for routing verification"""

    def test_simple_endpoint_works(self, client: TestClient):
        """Test simple endpoint returns correct message"""
        resp = client.post("/api/v1/records/test-simple")
        assert resp.status_code == 200
        assert resp.json() == {"message": "test endpoint works"}


# ============================================================================
# TEST: POST / - CREATE RECORD
# ============================================================================

class TestCreateRecord:
    """Test suite for creating medical records"""

    def test_create_record_success_patient(self, client: TestClient, db):
        """Test successful record creation by patient"""
        # Setup
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        # Create record
        resp = client.post("/api/v1/records/", json=SAMPLE_RECORD_DATA)

        assert resp.status_code == 201
        data = resp.json()
        assert data["symptoms"] == SAMPLE_RECORD_DATA["symptoms"]
        assert data["ai_prediction"] == SAMPLE_RECORD_DATA["ai_prediction"]
        assert data["confidence_score"] == SAMPLE_RECORD_DATA["confidence_score"]
        assert data["recommended_specialist"] == SAMPLE_RECORD_DATA["recommended_specialist"]
        assert data["status"] == "pending"
        assert data["patient_id"] == str(patient.id)
        assert "id" in data
        assert "created_at" in data

        # Verify in database
        db_record = db.query(MedicalRecord).filter(MedicalRecord.id == data["id"]).first()
        assert db_record is not None
        assert db_record.patient_id == patient.id

    def test_create_record_success_doctor(self, client: TestClient, db):
        """Test doctor can also create medical records"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/", json=SAMPLE_RECORD_DATA)

        assert resp.status_code == 201
        data = resp.json()
        assert data["patient_id"] == str(doctor.id)

    def test_create_record_with_minimal_data(self, client: TestClient, db):
        """Test record creation with only required fields (symptoms)"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/", json={"symptoms": ["symptom1"]})

        assert resp.status_code == 201
        data = resp.json()
        assert data["symptoms"] == ["symptom1"]
        assert data["ai_prediction"] is None
        assert data["confidence_score"] is None

    def test_create_record_empty_symptoms(self, client: TestClient, db):
        """Test record creation with empty symptoms list"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/", json={"symptoms": []})

        assert resp.status_code == 201
        data = resp.json()
        assert data["symptoms"] == []

    def test_create_record_unauthenticated(self, client: TestClient):
        """Test record creation fails without authentication"""
        resp = client.post("/api/v1/records/", json=SAMPLE_RECORD_DATA)
        assert resp.status_code == 401

    def test_create_record_invalid_confidence_score(self, client: TestClient, db):
        """Test record creation with invalid confidence score values"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        # Negative confidence score (should still accept - API doesn't validate range)
        resp = client.post("/api/v1/records/", json={
            "symptoms": ["fever"],
            "confidence_score": -0.5,
        })
        assert resp.status_code == 201

        # Over 1.0 confidence score
        resp = client.post("/api/v1/records/", json={
            "symptoms": ["fever"],
            "confidence_score": 1.5,
        })
        assert resp.status_code == 201


# ============================================================================
# TEST: GET / - LIST RECORDS
# ============================================================================

class TestListRecords:
    """Test suite for listing medical records with role-based filtering"""

    def test_list_records_patient_sees_own_only(self, client: TestClient, db):
        """Test patient sees only their own records"""
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "patient2@example.com", VALID_PASSWORD, "PATIENT")

        # Create records for both patients
        create_record_in_db(db, str(patient1.id))
        create_record_in_db(db, str(patient1.id))
        create_record_in_db(db, str(patient2.id))

        # Login as patient1
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert all(r["patient_id"] == str(patient1.id) for r in data)

    def test_list_records_doctor_sees_assigned_only(self, client: TestClient, db):
        """Test doctor sees only records assigned to them"""
        doctor1 = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        doctor2 = create_test_user(db, DOCTOR_EMAIL_2, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        # Create records assigned to different doctors
        create_record_in_db(db, str(patient.id), doctor_id=str(doctor1.id))
        create_record_in_db(db, str(patient.id), doctor_id=str(doctor1.id))
        create_record_in_db(db, str(patient.id), doctor_id=str(doctor2.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert all(r["doctor_id"] == str(doctor1.id) for r in data)

    def test_list_records_admin_sees_all(self, client: TestClient, db):
        """Test admin sees all records"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "patient2@example.com", VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        create_record_in_db(db, str(patient1.id))
        create_record_in_db(db, str(patient2.id), doctor_id=str(doctor.id))

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_list_records_pagination_skip(self, client: TestClient, db):
        """Test pagination with skip parameter"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        for _ in range(5):
            create_record_in_db(db, str(patient.id))

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/?skip=2&limit=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_list_records_pagination_limit(self, client: TestClient, db):
        """Test pagination limit validation"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        # Valid limit
        resp = client.get("/api/v1/records/?limit=50")
        assert resp.status_code == 200

        # Limit exceeds maximum
        resp = client.get("/api/v1/records/?limit=101")
        assert resp.status_code == 400
        assert "cannot exceed 100" in get_error_detail(resp.json())

    def test_list_records_pagination_negative_skip(self, client: TestClient, db):
        """Test pagination rejects negative skip"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/?skip=-1")
        assert resp.status_code == 400
        assert "cannot be negative" in get_error_detail(resp.json())

    def test_list_records_unauthenticated(self, client: TestClient):
        """Test listing records requires authentication"""
        resp = client.get("/api/v1/records/")
        assert resp.status_code == 401

    def test_list_records_empty(self, client: TestClient, db):
        """Test listing records when none exist"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 0


# ============================================================================
# TEST: GET /{record_id} - GET SINGLE RECORD
# ============================================================================

class TestGetRecord:
    """Test suite for retrieving a single medical record"""

    def test_get_record_patient_owner(self, client: TestClient, db):
        """Test patient can get their own record"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id))

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get(f"/api/v1/records/{record.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == record.id
        assert data["patient_id"] == str(patient.id)

    def test_get_record_assigned_doctor(self, client: TestClient, db):
        """Test doctor can get record assigned to them"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.get(f"/api/v1/records/{record.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == record.id

    def test_get_record_admin(self, client: TestClient, db):
        """Test admin can get any record"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id))

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.get(f"/api/v1/records/{record.id}")
        assert resp.status_code == 200

    def test_get_record_not_found(self, client: TestClient, db):
        """Test getting non-existent record returns 404"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get(f"/api/v1/records/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert "not found" in get_error_detail(resp.json()).lower()

    def test_get_record_forbidden_different_patient(self, client: TestClient, db):
        """Test patient cannot get another patient's record"""
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "patient2@example.com", VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient2.id))

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get(f"/api/v1/records/{record.id}")
        assert resp.status_code == 403
        assert "forbidden" in get_error_detail(resp.json()).lower()

    def test_get_record_forbidden_unassigned_doctor(self, client: TestClient, db):
        """Test doctor cannot get record not assigned to them"""
        doctor1 = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        doctor2 = create_test_user(db, DOCTOR_EMAIL_2, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor2.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.get(f"/api/v1/records/{record.id}")
        assert resp.status_code == 403

    def test_get_record_unauthenticated(self, client: TestClient, db):
        """Test getting record without authentication"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id))

        resp = client.get(f"/api/v1/records/{record.id}")
        assert resp.status_code == 401


# ============================================================================
# TEST: PATCH /{record_id} - UPDATE RECORD
# ============================================================================

class TestPatchRecord:
    """Test suite for updating medical records"""

    def test_patch_record_doctor_adds_notes(self, client: TestClient, db):
        """Test doctor can add notes to their record"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        notes = "Patient shows improvement"
        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "doctor_notes": notes,
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["doctor_notes"] == notes

    def test_patch_record_doctor_changes_status(self, client: TestClient, db):
        """Test doctor can change record status"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "status": "approved",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"

    def test_patch_record_both_notes_and_status(self, client: TestClient, db):
        """Test doctor can update both notes and status"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "doctor_notes": "Test notes",
            "status": "reviewed",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["doctor_notes"] == "Test notes"
        assert data["status"] == "reviewed"

    def test_patch_record_admin_can_update(self, client: TestClient, db):
        """Test admin can update any record"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id))

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "status": "approved",
        })

        assert resp.status_code == 200

    def test_patch_record_invalid_status(self, client: TestClient, db):
        """Test updating with invalid status value"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "status": "invalid_status",
        })

        assert resp.status_code == 422
        assert "status must be one of" in get_error_detail(resp.json())

    def test_patch_record_not_found(self, client: TestClient, db):
        """Test patching non-existent record"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.patch(f"/api/v1/records/{uuid.uuid4()}", json={
            "status": "approved",
        })

        assert resp.status_code == 404

    def test_patch_record_forbidden_unassigned_doctor(self, client: TestClient, db):
        """Test doctor cannot update record not assigned to them"""
        doctor1 = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        doctor2 = create_test_user(db, DOCTOR_EMAIL_2, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor2.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "status": "approved",
        })

        assert resp.status_code == 403
        assert "not assigned" in get_error_detail(resp.json())

    def test_patch_record_patient_forbidden(self, client: TestClient, db):
        """Test patient cannot update records"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id))

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "status": "approved",
        })

        assert resp.status_code == 403

    def test_patch_record_unauthenticated(self, client: TestClient, db):
        """Test patching without authentication"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id))

        resp = client.patch(f"/api/v1/records/{record.id}", json={
            "status": "approved",
        })

        assert resp.status_code == 401


# ============================================================================
# TEST: DELETE /{record_id} - DELETE RECORD
# ============================================================================

class TestDeleteRecord:
    """Test suite for deleting medical records"""

    def test_delete_record_patient_pending_own(self, client: TestClient, db):
        """Test patient can delete their own pending record"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), status="pending")

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 204

        # Verify deletion
        db_record = db.query(MedicalRecord).filter(MedicalRecord.id == record.id).first()
        assert db_record is None

    def test_delete_record_doctor_pending_assigned(self, client: TestClient, db):
        """Test doctor can delete pending record assigned to them"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 204

    def test_delete_record_admin_any_status(self, client: TestClient, db):
        """Test admin can delete record with any status"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), status="approved")

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 204

    def test_delete_record_patient_approved_forbidden(self, client: TestClient, db):
        """Test patient cannot delete approved record"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), status="approved")

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 403
        assert "pending" in get_error_detail(resp.json())

    def test_delete_record_doctor_approved_forbidden(self, client: TestClient, db):
        """Test doctor cannot delete approved record"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="approved")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 403

    def test_delete_record_not_found(self, client: TestClient, db):
        """Test deleting non-existent record"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.delete(f"/api/v1/records/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_delete_record_forbidden_other_patient(self, client: TestClient, db):
        """Test patient cannot delete another patient's record"""
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "patient2@example.com", VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient2.id), status="pending")

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 403

    def test_delete_record_unauthenticated(self, client: TestClient, db):
        """Test delete without authentication"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), status="pending")

        resp = client.delete(f"/api/v1/records/{record.id}")
        assert resp.status_code == 401


# ============================================================================
# TEST: POST /bulk-approve - BULK APPROVE RECORDS
# ============================================================================

class TestBulkApprove:
    """Test suite for bulk approval of medical records"""

    def test_bulk_approve_doctor_own_records(self, client: TestClient, db):
        """Test doctor can bulk approve assigned pending records"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        record1 = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")
        record2 = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record1.id, record2.id],
            "status": "approved",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 2
        assert len(data["failed_records"]) == 0

        # Verify in database
        db.expire_all()
        db_record1 = db.query(MedicalRecord).filter(MedicalRecord.id == record1.id).first()
        assert db_record1.status == "approved"

    def test_bulk_approve_admin_any_records(self, client: TestClient, db):
        """Test admin can bulk approve any records"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "patient2@example.com", VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        record1 = create_record_in_db(db, str(patient1.id), status="pending")
        record2 = create_record_in_db(db, str(patient2.id), doctor_id=str(doctor.id), status="pending")

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record1.id, record2.id],
            "status": "approved",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 2

    def test_bulk_approve_with_notes(self, client: TestClient, db):
        """Test bulk approve with doctor notes"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        notes = "Bulk approval notes"
        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record.id],
            "notes": notes,
            "status": "approved",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 1

        db.expire_all()
        db_record = db.query(MedicalRecord).filter(MedicalRecord.id == record.id).first()
        assert db_record.doctor_notes == notes

    def test_bulk_approve_partial_failure(self, client: TestClient, db):
        """Test bulk approve with mixed success/failure"""
        doctor1 = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        doctor2 = create_test_user(db, DOCTOR_EMAIL_2, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        record1 = create_record_in_db(db, str(patient.id), doctor_id=str(doctor1.id), status="pending")
        record2 = create_record_in_db(db, str(patient.id), doctor_id=str(doctor2.id), status="pending")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record1.id, record2.id],
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 1
        assert len(data["failed_records"]) == 1
        assert data["failed_records"][0]["id"] == record2.id

    def test_bulk_approve_nonexistent_record(self, client: TestClient, db):
        """Test bulk approve with non-existent record ID"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        fake_id = str(uuid.uuid4())
        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record.id, fake_id],
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 1
        assert len(data["failed_records"]) == 1
        assert data["failed_records"][0]["id"] == fake_id

    def test_bulk_approve_invalid_status(self, client: TestClient, db):
        """Test bulk approve with invalid status"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id))

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record.id],
            "status": "invalid_status",
        })

        assert resp.status_code == 422

    def test_bulk_approve_default_status(self, client: TestClient, db):
        """Test bulk approve uses default status 'approved' if not specified"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record.id],
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 1

        db.expire_all()
        db_record = db.query(MedicalRecord).filter(MedicalRecord.id == record.id).first()
        assert db_record.status == "approved"

    def test_bulk_approve_patient_forbidden(self, client: TestClient, db):
        """Test patient cannot use bulk approve endpoint"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        record = create_record_in_db(db, str(patient.id))

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [record.id],
        })

        assert resp.status_code == 403

    def test_bulk_approve_unauthenticated(self, client: TestClient):
        """Test bulk approve requires authentication"""
        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [str(uuid.uuid4())],
        })

        assert resp.status_code == 401

    def test_bulk_approve_empty_list(self, client: TestClient, db):
        """Test bulk approve with empty record list"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": [],
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 0


# ============================================================================
# TEST: GET /pending/list - LIST PENDING RECORDS
# ============================================================================

class TestListPendingRecords:
    """Test suite for listing pending records"""

    def test_list_pending_doctor_assigned_records(self, client: TestClient, db):
        """Test doctor sees only pending records assigned to them"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        # Create pending and approved records
        pending = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")
        approved = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="approved")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/pending/list")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == pending.id
        assert data[0]["status"] == "pending"

    def test_list_pending_admin_all_pending(self, client: TestClient, db):
        """Test admin sees all pending records"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "patient2@example.com", VALID_PASSWORD, "PATIENT")

        create_record_in_db(db, str(patient1.id), doctor_id=str(doctor.id), status="pending")
        create_record_in_db(db, str(patient2.id), status="pending")
        create_record_in_db(db, str(patient1.id), status="approved")

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/pending/list")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        assert all(r["status"] == "pending" for r in data)

    def test_list_pending_sorted_by_confidence(self, client: TestClient, db):
        """Test pending records sorted by confidence score (highest first)"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        # Create records with different confidence scores
        record1 = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")
        record1.confidence_score = 0.5
        db.commit()

        record2 = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")
        record2.confidence_score = 0.9
        db.commit()

        record3 = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")
        record3.confidence_score = 0.7
        db.commit()

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/pending/list")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        assert data[0]["confidence_score"] == 0.9
        assert data[1]["confidence_score"] == 0.7
        assert data[2]["confidence_score"] == 0.5

    def test_list_pending_pagination(self, client: TestClient, db):
        """Test pending list pagination"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        for _ in range(5):
            create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/pending/list?skip=1&limit=2")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2

    def test_list_pending_patient_forbidden(self, client: TestClient, db):
        """Test patient cannot access pending list"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/pending/list")
        assert resp.status_code == 403

    def test_list_pending_unauthenticated(self, client: TestClient):
        """Test pending list requires authentication"""
        resp = client.get("/api/v1/records/pending/list")
        assert resp.status_code == 401


# ============================================================================
# TEST: GET /stats/summary - GET ADMIN STATISTICS
# ============================================================================

class TestGetStats:
    """Test suite for admin statistics endpoint"""

    def test_get_stats_admin(self, client: TestClient, db):
        """Test admin can get statistics"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient1 = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        patient2 = create_test_user(db, "patient2@example.com", VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        create_record_in_db(db, str(patient1.id))
        create_record_in_db(db, str(patient2.id))

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/stats/summary")
        assert resp.status_code == 200
        data = resp.json()

        assert data["total_records"] == 2
        assert data["total_patients"] == 2
        assert data["total_doctors"] == 1
        assert len(data["recent_records"]) <= 5

    def test_get_stats_recent_records_limit(self, client: TestClient, db):
        """Test stats returns only last 5 records"""
        admin = create_test_user(db, ADMIN_EMAIL, VALID_PASSWORD, "ADMIN")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        for _ in range(10):
            create_record_in_db(db, str(patient.id))

        login_user(client, ADMIN_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/stats/summary")
        assert resp.status_code == 200
        data = resp.json()

        assert data["total_records"] == 10
        assert len(data["recent_records"]) == 5

    def test_get_stats_non_admin_forbidden(self, client: TestClient, db):
        """Test non-admin cannot access stats"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/stats/summary")
        assert resp.status_code == 403

    def test_get_stats_doctor_forbidden(self, client: TestClient, db):
        """Test doctor cannot access stats"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        resp = client.get("/api/v1/records/stats/summary")
        assert resp.status_code == 403

    def test_get_stats_unauthenticated(self, client: TestClient):
        """Test stats requires authentication"""
        resp = client.get("/api/v1/records/stats/summary")
        assert resp.status_code == 401


# ============================================================================
# INTEGRATION TESTS - MULTI-ENDPOINT WORKFLOWS
# ============================================================================

class TestRecordWorkflows:
    """Integration tests for complete record management workflows"""

    def test_create_and_approve_workflow(self, client: TestClient, db):
        """Test workflow: patient creates -> doctor approves"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        # Patient creates record
        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)
        resp = client.post("/api/v1/records/", json=SAMPLE_RECORD_DATA)
        assert resp.status_code == 201
        record_id = resp.json()["id"]

        # Assign doctor to record
        record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
        record.doctor_id = doctor.id
        db.commit()

        # Doctor approves record
        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)
        resp = client.patch(f"/api/v1/records/{record_id}", json={
            "status": "approved",
            "doctor_notes": "Patient is fine",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_bulk_create_and_bulk_approve(self, client: TestClient, db):
        """Test workflow: bulk create -> bulk approve"""
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        # Create multiple records
        record_ids = []
        for i in range(3):
            record = create_record_in_db(db, str(patient.id), doctor_id=str(doctor.id), status="pending")
            record_ids.append(record.id)

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)

        # Bulk approve
        resp = client.post("/api/v1/records/bulk-approve", json={
            "record_ids": record_ids,
            "status": "approved",
            "notes": "All approved",
        })

        assert resp.status_code == 200
        data = resp.json()
        assert data["approved_count"] == 3

        # Verify all approved
        for record_id in record_ids:
            record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
            assert record.status == "approved"

    def test_create_retrieve_update_delete(self, client: TestClient, db):
        """Test CRUD workflow"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")
        doctor = create_test_user(db, DOCTOR_EMAIL, VALID_PASSWORD, "DOCTOR")

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        # Create
        resp = client.post("/api/v1/records/", json=SAMPLE_RECORD_DATA)
        assert resp.status_code == 201
        record_id = resp.json()["id"]

        # Retrieve
        resp = client.get(f"/api/v1/records/{record_id}")
        assert resp.status_code == 200

        # Assign and update
        record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
        record.doctor_id = doctor.id
        db.commit()

        login_user(client, DOCTOR_EMAIL, VALID_PASSWORD)
        resp = client.patch(f"/api/v1/records/{record_id}", json={"status": "reviewed"})
        assert resp.status_code == 200

        # Can't delete after approval
        resp = client.delete(f"/api/v1/records/{record_id}")
        assert resp.status_code == 403

    def test_pagination_across_multiple_fetches(self, client: TestClient, db):
        """Test retrieving paginated results across multiple requests"""
        patient = create_test_user(db, PATIENT_EMAIL, VALID_PASSWORD, "PATIENT")

        # Create 10 records
        for _ in range(10):
            create_record_in_db(db, str(patient.id))

        login_user(client, PATIENT_EMAIL, VALID_PASSWORD)

        # Fetch first page
        resp = client.get("/api/v1/records/?skip=0&limit=5")
        assert resp.status_code == 200
        page1 = resp.json()
        assert len(page1) == 5

        # Fetch second page
        resp = client.get("/api/v1/records/?skip=5&limit=5")
        assert resp.status_code == 200
        page2 = resp.json()
        assert len(page2) == 5

        # Verify no overlap
        ids1 = {r["id"] for r in page1}
        ids2 = {r["id"] for r in page2}
        assert len(ids1.intersection(ids2)) == 0
