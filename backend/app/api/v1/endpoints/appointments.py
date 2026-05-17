from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.models import Appointment, User, UserRole
from app.core.security import get_current_user
from app.core.pagination import validate_pagination
from app.core.serializers import serialize_appointment

router = APIRouter()


VALID_SPECIALISTS = {
    "General Physician", "Cardiologist", "Neurologist", "Dermatologist",
    "Pediatrician", "Endocrinologist", "Pulmonologist", "Orthopedist",
    "Psychiatrist", "Gastroenterologist", "Infectious Disease Specialist",
    "Cardiology", "Neurology", "Dermatology", "Pediatrics",  # legacy aliases
}


class AppointmentCreate(BaseModel):
    specialist: str
    date: str
    time: str
    reason: Optional[str] = Field(None, max_length=500)


class AppointmentUpdate(BaseModel):
    specialist: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    status: Optional[str] = None
    reason: Optional[str] = None


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    specialist: str
    date: str
    time: str
    status: str
    reason: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("", include_in_schema=False)
@router.get("/")
def list_appointments(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate pagination parameters
    validate_pagination(skip, limit)

    if current_user.role == UserRole.ADMIN:
        records = (
            db.query(Appointment)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    elif current_user.role == UserRole.DOCTOR:
        # Doctors see appointments of their assigned patients
        from app.models.models import DoctorPatient
        assigned_patient_ids = [dp.patient_id for dp in db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == current_user.id,
            DoctorPatient.status == "active"
        ).all()]
        records = (
            db.query(Appointment)
            .filter(Appointment.patient_id.in_(assigned_patient_ids) if assigned_patient_ids else False)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        ) if assigned_patient_ids else []
    else:
        # Patients see only their own appointments
        records = (
            db.query(Appointment)
            .filter(Appointment.patient_id == current_user.id)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    # Batch-load all patient emails in one query to avoid N+1
    patient_ids = list({str(r.patient_id) for r in records})
    patients = db.query(User).filter(User.id.in_(patient_ids)).all() if patient_ids else []
    patient_map = {str(p.id): p.email for p in patients}
    return [serialize_appointment(r, patient_email=patient_map.get(str(r.patient_id))) for r in records]


@router.post("/", status_code=201)
def create_appointment(
    body: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate specialist against known list (allows handling slash-separated names too)
    spec = body.specialist.strip()
    spec_parts = [s.strip() for s in spec.replace("/", ",").split(",")]
    if not any(p in VALID_SPECIALISTS for p in spec_parts):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid specialist. Must include one of: {sorted(VALID_SPECIALISTS)}"
        )

    appt = Appointment(
        id=str(uuid.uuid4()),
        patient_id=str(current_user.id),
        specialist=body.specialist,
        date=body.date,
        time=body.time,
        reason=body.reason,
        status="upcoming",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return serialize_appointment(appt, patient_email=current_user.email)


@router.put("/{appt_id}")
def update_appointment(
    appt_id: str,
    body: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    # Only patient owner or admin can update appointments
    if current_user.role == UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctors cannot modify appointments")
    if str(appt.patient_id) != str(current_user.id) and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden")

    update_data = body.model_dump(exclude_unset=True)

    # Patients can only set status to "cancelled" (not "completed" - that's admin/doctor)
    if "status" in update_data and current_user.role == UserRole.PATIENT:
        if update_data["status"] not in ("cancelled", "upcoming"):
            raise HTTPException(
                status_code=403,
                detail="Patients can only cancel or reschedule appointments. Only an admin can mark as completed."
            )

    # Validate status whitelist
    if "status" in update_data and update_data["status"] not in ("upcoming", "completed", "cancelled"):
        raise HTTPException(status_code=422, detail="Invalid status")

    for field, value in update_data.items():
        setattr(appt, field, value)

    db.commit()
    db.refresh(appt)
    patient = db.query(User).filter(User.id == appt.patient_id).first()
    return serialize_appointment(appt, patient_email=patient.email if patient else None)


@router.delete("/{appt_id}", status_code=204)
def cancel_appointment(
    appt_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = db.query(Appointment).filter(Appointment.id == appt_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    # Only patient owner or admin can cancel appointments
    if current_user.role == UserRole.DOCTOR:
        raise HTTPException(status_code=403, detail="Doctors cannot cancel appointments")
    if str(appt.patient_id) != str(current_user.id) and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(appt)
    db.commit()
