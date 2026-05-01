from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.models import User, MedicalRecord, UserRole
from app.core.security import get_current_user

router = APIRouter()

@router.get("/stats/summary")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_records = db.query(MedicalRecord).count()
    total_patients = db.query(User).filter(User.role == UserRole.PATIENT).count()
    total_doctors = db.query(User).filter(User.role == UserRole.DOCTOR).count()
    
    # Get recent records
    recent_records = db.query(MedicalRecord).order_by(MedicalRecord.created_at.desc()).limit(5).all()
    
    return {
        "total_records": total_records,
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "recent_records": recent_records
    }

@router.get("/")
def get_records(skip: int = 0, limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.PATIENT:
        return db.query(MedicalRecord).filter(MedicalRecord.patient_id == current_user.id).offset(skip).limit(limit).all()
    return db.query(MedicalRecord).offset(skip).limit(limit).all()

@router.get("/{id}")
def get_record(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(MedicalRecord).filter(MedicalRecord.id == id).first()
