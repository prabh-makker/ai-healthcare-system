"""Serializers for consistent model-to-dict conversions."""

from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import MedicalRecord, Appointment, User


def serialize_medical_record(record: MedicalRecord) -> dict:
    """Convert MedicalRecord model to serializable dict."""
    return {
        "id": str(record.id),
        "patient_id": str(record.patient_id),
        "doctor_id": str(record.doctor_id) if record.doctor_id else None,
        "symptoms": record.symptoms or [],
        "ai_prediction": record.ai_prediction,
        "confidence_score": record.confidence_score,
        "recommended_specialist": record.recommended_specialist,
        "image_url": record.image_url,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "status": getattr(record, "status", "pending") or "pending",
        "doctor_notes": getattr(record, "doctor_notes", None),
    }


def serialize_appointment(appointment: Appointment, db: Optional[Session] = None) -> dict:
    """Convert Appointment model to serializable dict."""
    patient_email = None
    if db:
        patient = db.query(User).filter(User.id == appointment.patient_id).first()
        patient_email = patient.email if patient else None
    return {
        "id": str(appointment.id),
        "patient_id": str(appointment.patient_id),
        "patient_email": patient_email,
        "specialist": appointment.specialist,
        "date": appointment.date,
        "time": appointment.time,
        "status": appointment.status,
        "reason": appointment.reason,
        "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
    }
