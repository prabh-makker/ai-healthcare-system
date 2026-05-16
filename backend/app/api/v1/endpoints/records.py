import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.db.session import get_db
from app.models.models import User, MedicalRecord, UserRole
from app.core.security import get_current_user, require_role
from app.core.pagination import validate_pagination
from app.core.authorization import check_record_ownership, check_record_modification
from app.core.constants import RECORD_STATUS_ALLOWED
from app.core.serializers import serialize_medical_record

router = APIRouter()


@router.post("/test-simple", status_code=200)
def test_simple():
    """Simple test endpoint to verify routing works."""
    return {"message": "test endpoint works"}


class RecordCreate(BaseModel):
    symptoms: List[str]
    ai_prediction: Optional[str] = None
    confidence_score: Optional[float] = None
    recommended_specialist: Optional[str] = None


class RecordPatch(BaseModel):
    doctor_notes: Optional[str] = None
    status: Optional[str] = None


class BulkApprove(BaseModel):
    record_ids: List[str]
    notes: Optional[str] = None
    status: Optional[str] = "approved"


@router.get("/stats/summary")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):

    total_records = db.query(MedicalRecord).count()
    total_patients = db.query(User).filter(User.role == UserRole.PATIENT).count()
    total_doctors = db.query(User).filter(User.role == UserRole.DOCTOR).count()
    recent_records = (
        db.query(MedicalRecord)
        .order_by(MedicalRecord.created_at.desc())
        .limit(5)
        .all()
    )
    return {
        "total_records": total_records,
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "recent_records": [serialize_medical_record(r) for r in recent_records],
    }


@router.get("")
def get_records(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate pagination parameters
    validate_pagination(skip, limit)

    query = db.query(MedicalRecord)

    if current_user.role == UserRole.PATIENT:
        # Patients see only their own records
        query = query.filter(MedicalRecord.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        # Doctors see only records assigned to them
        query = query.filter(MedicalRecord.doctor_id == current_user.id)
    # ADMIN sees all records

    records = (
        query
        .order_by(MedicalRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [serialize_medical_record(r) for r in records]


@router.post("/", status_code=201)
def create_record(
    body: RecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = MedicalRecord(
        id=str(uuid.uuid4()),
        patient_id=str(current_user.id),
        symptoms=body.symptoms,
        ai_prediction=body.ai_prediction,
        confidence_score=body.confidence_score,
        recommended_specialist=body.recommended_specialist,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return serialize_medical_record(record)


@router.get("/{record_id}")
def get_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if not check_record_ownership(record, current_user):
        raise HTTPException(status_code=403, detail="Forbidden")
    return serialize_medical_record(record)


@router.patch("/{record_id}")
def patch_record(
    record_id: str,
    body: RecordPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ADMIN)),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    # Verify doctor is assigned or admin
    is_allowed, error_msg = check_record_modification(record, current_user)
    if not is_allowed:
        raise HTTPException(status_code=403, detail=error_msg)
    if body.doctor_notes is not None:
        record.doctor_notes = body.doctor_notes
    if body.status is not None:
        if body.status not in RECORD_STATUS_ALLOWED:
            raise HTTPException(status_code=422, detail=f"status must be one of {RECORD_STATUS_ALLOWED}")
        record.status = body.status
    db.commit()
    db.refresh(record)
    return serialize_medical_record(record)


@router.delete("/{record_id}", status_code=204)
def delete_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Authorization check: enforce deletion policy (pending only for non-admin)
    is_allowed, error_msg = check_record_deletion(record, current_user)
    if not is_allowed:
        raise HTTPException(status_code=403, detail=error_msg)

    db.delete(record)
    db.commit()


@router.post("/bulk-approve")
def bulk_approve_records(
    body: BulkApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ADMIN)),
):
    """
    Bulk approve multiple medical records.
    Only the assigned doctor (or admin) can approve.
    """
    if body.status not in RECORD_STATUS_ALLOWED:
        raise HTTPException(status_code=422, detail=f"status must be one of {RECORD_STATUS_ALLOWED}")

    # Fetch all records in one query
    found = {r.id: r for r in db.query(MedicalRecord).filter(
        MedicalRecord.id.in_(body.record_ids)
    ).all()}

    approved_count = 0
    failed_records = []

    for record_id in body.record_ids:
        record = found.get(record_id)
        if not record:
            failed_records.append({"id": record_id, "reason": "Not found"})
            continue

        is_allowed, error_msg = check_record_modification(record, current_user)
        if not is_allowed:
            failed_records.append({"id": record_id, "reason": error_msg})
            continue

        record.status = body.status
        if body.notes:
            record.doctor_notes = body.notes
        approved_count += 1

    db.commit()
    return {
        "approved_count": approved_count,
        "failed_records": failed_records,
        "total_processed": len(body.record_ids),
    }


@router.get("/pending/list")
def list_pending_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR, UserRole.ADMIN)),
):
    """
    Get pending records for the doctor (records assigned to them, status=pending).
    Used by the approval queue page.
    """
    validate_pagination(skip, limit)

    query = db.query(MedicalRecord).filter(MedicalRecord.status == "pending")

    if current_user.role == UserRole.DOCTOR:
        query = query.filter(MedicalRecord.doctor_id == current_user.id)

    records = (
        query
        .order_by(MedicalRecord.confidence_score.desc().nullslast(), MedicalRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [serialize_medical_record(r) for r in records]
