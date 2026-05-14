import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.db.session import get_db
from app.models.models import User, MedicalRecord, UserRole
from app.core.security import get_current_user

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
    current_user: User = Depends(get_current_user),
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
    if current_user.role == UserRole.PATIENT:
        records = (
            db.query(MedicalRecord)
            .filter(MedicalRecord.patient_id == current_user.id)
            .order_by(MedicalRecord.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    else:
        records = (
            db.query(MedicalRecord)
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
    if current_user.role == UserRole.PATIENT and str(record.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return _serialize(record)


@router.patch("/{record_id}")
def patch_record(
    record_id: str,
    body: RecordPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Only doctors can update records")
    record = db.query(MedicalRecord).filter(MedicalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    if body.doctor_notes is not None:
        record.doctor_notes = body.doctor_notes
        record.doctor_id = current_user.id
    if body.status is not None:
        allowed = {"pending", "approved", "reviewed"}
        if body.status not in allowed:
            raise HTTPException(status_code=422, detail=f"status must be one of {allowed}")
        record.status = body.status
        record.doctor_id = current_user.id
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
    is_owner = str(record.patient_id) == str(current_user.id)
    if current_user.role == UserRole.PATIENT and not is_owner:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(record)
    db.commit()
    return None
