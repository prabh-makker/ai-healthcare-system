from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from app.db.session import get_db
from app.models.models import Appointment, User, UserRole
from app.core.security import get_current_user
from app.core.pagination import validate_pagination
from app.core.serializers import serialize_appointment

router = APIRouter()


class AppointmentCreate(BaseModel):
    specialist: str
    date: str
    time: str
    reason: Optional[str] = None


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
    else:
        # Non-admin users only see their own appointments
        records = (
            db.query(Appointment)
            .filter(Appointment.patient_id == current_user.id)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
    return [serialize_appointment(r) for r in records]


@router.post("/", status_code=201)
def create_appointment(
    body: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appt = Appointment(
        id=uuid.uuid4(),
        patient_id=current_user.id,
        specialist=body.specialist,
        date=body.date,
        time=body.time,
        reason=body.reason,
        status="upcoming",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return serialize_appointment(appt)


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

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)

    db.commit()
    db.refresh(appt)
    return serialize_appointment(appt)


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
