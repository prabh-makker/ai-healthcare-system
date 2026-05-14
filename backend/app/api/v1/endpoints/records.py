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

router = APIRouter()


class RecordCreate(BaseModel):
    symptoms: List[str]
    ai_prediction: Optional[str] = None
    confidence_score: Optional[float] = None
    recommended_specialist: Optional[str] = None


class RecordPatch(BaseModel):
    doctor_notes: Optional[str] = None
    status: Optional[str] = None


def _serialize(r: MedicalRecord) -> dict:
    return {
        "id": str(r.id),
        "patient_id": str(r.patient_id),
        "doctor_id": str(r.doctor_id) if r.doctor_id else None,
        "symptoms": r.symptoms or [],
        "ai_prediction": r.ai_prediction,
        "confidence_score": r.confidence_score,
        "recommended_specialist": r.recommended_specialist,
        "image_url": r.image_url,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "status": getattr(r, "status", "pending") or "pending",
        "doctor_notes": getattr(r, "doctor_notes", None),
    }


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
        "recent_records": [_serialize(r) for r in recent_records],
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
    return [_serialize(r) for r in records]


@router.post("/", status_code=201)
def create_record(
    body: RecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = MedicalRecord(
        id=uuid.uuid4(),
        patient_id=current_user.id,
        symptoms=body.symptoms,
        ai_prediction=body.ai_prediction,
        confidence_score=body.confidence_score,
        recommended_specialist=body.recommended_specialist,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _serialize(record)


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
    return _serialize(record)


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
    return _serialize(record)


@router.delete("/{record_id}", status_code=204)
def delete_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Authorization check: only patient owner or assigned doctor can delete
    is_allowed, error_msg = check_record_modification(record, current_user)
    if not is_allowed:
        raise HTTPException(status_code=403, detail=error_msg)

    db.delete(record)
    db.commit()
