"""
Unit tests for authorization module covering all critical gaps:
- check_record_ownership() - 6 tests
- check_record_modification() - 5 tests
- check_record_deletion() - 16 tests (security-critical)
- Registration security - 6 tests (ADMIN blocked)
Total: 33 tests
"""
import pytest
import uuid
from unittest.mock import MagicMock
from app.core.authorization import (
    check_record_ownership,
    check_record_modification,
    check_record_deletion,
)
from app.models.models import UserRole


def make_user(role, user_id=None):
    user = MagicMock()
    user.id = user_id or uuid.uuid4()
    user.role = UserRole(role)
    return user


def make_record(patient_id, doctor_id=None, status="pending"):
    record = MagicMock()
    record.patient_id = patient_id
    record.doctor_id = doctor_id
    record.status = status
    return record


class TestCheckRecordOwnership:

    def test_admin_access_any(self):
        admin = make_user("ADMIN")
        record = make_record(patient_id=uuid.uuid4())
        assert check_record_ownership(record, admin) is True

    def test_patient_own_record(self):
        patient = make_user("PATIENT")
        record = make_record(patient_id=patient.id)
        assert check_record_ownership(record, patient) is True

    def test_patient_other_record(self):
        p1 = make_user("PATIENT")
        p2 = make_user("PATIENT")
        record = make_record(patient_id=p2.id)
        assert check_record_ownership(record, p1) is False

    def test_doctor_assigned(self):
        doctor = make_user("DOCTOR")
        record = make_record(patient_id=uuid.uuid4(), doctor_id=doctor.id)
        assert check_record_ownership(record, doctor) is True

    def test_doctor_unassigned(self):
        d1 = make_user("DOCTOR")
        d2 = make_user("DOCTOR")
        record = make_record(patient_id=uuid.uuid4(), doctor_id=d2.id)
        assert check_record_ownership(record, d1) is False

    def test_doctor_no_assignment(self):
        doctor = make_user("DOCTOR")
        record = make_record(patient_id=uuid.uuid4(), doctor_id=None)
        assert check_record_ownership(record, doctor) is False


class TestCheckRecordModification:

    def test_admin_modify_any(self):
        admin = make_user("ADMIN")
        record = make_record(patient_id=uuid.uuid4())
        allowed, msg = check_record_modification(record, admin)
        assert allowed is True

    def test_patient_own(self):
        patient = make_user("PATIENT")
        record = make_record(patient_id=patient.id)
        allowed, _ = check_record_modification(record, patient)
        assert allowed is True

    def test_patient_other_forbidden(self):
        p1 = make_user("PATIENT")
        p2 = make_user("PATIENT")
        record = make_record(patient_id=p2.id)
        allowed, msg = check_record_modification(record, p1)
        assert allowed is False
        assert "Forbidden" in msg

    def test_doctor_assigned(self):
        doctor = make_user("DOCTOR")
        record = make_record(patient_id=uuid.uuid4(), doctor_id=doctor.id)
        allowed, _ = check_record_modification(record, doctor)
        assert allowed is True

    def test_doctor_unassigned_forbidden(self):
        d1 = make_user("DOCTOR")
        d2 = make_user("DOCTOR")
        record = make_record(patient_id=uuid.uuid4(), doctor_id=d2.id)
        allowed, msg = check_record_modification(record, d1)
        assert allowed is False
        assert "not assigned" in msg


class TestCheckRecordDeletion:

    def test_admin_pending(self):
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), status="pending"), make_user("ADMIN"))
        assert ok is True

    def test_admin_approved(self):
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), status="approved"), make_user("ADMIN"))
        assert ok is True

    def test_admin_completed(self):
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), status="completed"), make_user("ADMIN"))
        assert ok is True

    def test_admin_reviewed(self):
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), status="reviewed"), make_user("ADMIN"))
        assert ok is True

    def test_patient_own_pending_allowed(self):
        p = make_user("PATIENT")
        ok, _ = check_record_deletion(make_record(p.id, status="pending"), p)
        assert ok is True

    def test_patient_own_approved_blocked(self):
        p = make_user("PATIENT")
        ok, msg = check_record_deletion(make_record(p.id, status="approved"), p)
        assert ok is False
        assert "pending" in msg.lower()

    def test_patient_own_completed_blocked(self):
        p = make_user("PATIENT")
        ok, _ = check_record_deletion(make_record(p.id, status="completed"), p)
        assert ok is False

    def test_patient_other_pending_blocked(self):
        p1 = make_user("PATIENT")
        p2 = make_user("PATIENT")
        ok, msg = check_record_deletion(make_record(p2.id, status="pending"), p1)
        assert ok is False
        assert "Forbidden" in msg

    def test_patient_other_approved_blocked(self):
        p1 = make_user("PATIENT")
        p2 = make_user("PATIENT")
        ok, _ = check_record_deletion(make_record(p2.id, status="approved"), p1)
        assert ok is False

    def test_doctor_assigned_pending_allowed(self):
        d = make_user("DOCTOR")
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), doctor_id=d.id, status="pending"), d)
        assert ok is True

    def test_doctor_assigned_approved_blocked(self):
        d = make_user("DOCTOR")
        ok, msg = check_record_deletion(make_record(uuid.uuid4(), doctor_id=d.id, status="approved"), d)
        assert ok is False
        assert "pending" in msg.lower()

    def test_doctor_assigned_completed_blocked(self):
        d = make_user("DOCTOR")
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), doctor_id=d.id, status="completed"), d)
        assert ok is False

    def test_doctor_unassigned_pending_blocked(self):
        d1 = make_user("DOCTOR")
        d2 = make_user("DOCTOR")
        ok, msg = check_record_deletion(make_record(uuid.uuid4(), doctor_id=d2.id, status="pending"), d1)
        assert ok is False
        assert "not assigned" in msg

    def test_doctor_unassigned_approved_blocked(self):
        d1 = make_user("DOCTOR")
        d2 = make_user("DOCTOR")
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), doctor_id=d2.id, status="approved"), d1)
        assert ok is False

    def test_doctor_no_assignment_blocked(self):
        d = make_user("DOCTOR")
        ok, _ = check_record_deletion(make_record(uuid.uuid4(), doctor_id=None, status="pending"), d)
        assert ok is False


class TestRegistrationSecurity:

    def test_admin_role_coerced_to_patient(self, client, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": "attacker@evil.com", "password": "Attack@1234", "role": "ADMIN",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "PATIENT"

    def test_admin_lowercase_coerced(self, client, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": "attacker2@evil.com", "password": "Attack@1234", "role": "admin",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "PATIENT"

    def test_patient_role_allowed(self, client, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": "patient@test.com", "password": "Patient@1234", "role": "PATIENT",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "PATIENT"

    def test_doctor_role_allowed(self, client, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": "doctor@test.com", "password": "Doctor@1234", "role": "DOCTOR",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "DOCTOR"

    def test_invalid_role_defaults_patient(self, client, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": "super@test.com", "password": "Super@1234", "role": "SUPERUSER",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "PATIENT"

    def test_no_role_defaults_patient(self, client, db):
        resp = client.post("/api/v1/auth/register", json={
            "email": "norole@test.com", "password": "NoRole@1234",
        })
        assert resp.status_code == 201
        assert resp.json()["role"] == "PATIENT"
