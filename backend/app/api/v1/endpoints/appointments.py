from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid
import logging

from app.db.session import get_db
from app.models.models import Appointment, User, UserRole
from app.core.security import get_current_user, require_role
from app.core.pagination import validate_pagination
from app.core.serializers import serialize_appointment
from app.api.v1.endpoints.notifications import create_notification

logger = logging.getLogger(__name__)

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


@router.get("/admin/doctors-summary")
def admin_doctors_appointment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: per-doctor appointment summary."""
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()
    result = []
    for doc in doctors:
        # All appointments where this doctor is assigned OR specialist matches doctor's specialization
        # Use doctor_id first (newer), fallback to specialist match
        appts = db.query(Appointment).filter(Appointment.doctor_id == str(doc.id)).all()

        # If no doctor_id-linked appts, try specialist match via doctor_profile
        if not appts and doc.doctor_profile:
            appts = db.query(Appointment).filter(
                Appointment.specialist == doc.doctor_profile.specialization
            ).all()

        total = len(appts)
        upcoming = sum(1 for a in appts if a.status == "upcoming")
        completed = sum(1 for a in appts if a.status == "completed")
        cancelled = sum(1 for a in appts if a.status == "cancelled")
        pending = sum(1 for a in appts if a.status == "pending" or a.status == "scheduled")

        # Today's appointments
        from datetime import date
        today_str = date.today().isoformat()
        today_count = sum(1 for a in appts if a.date == today_str)

        result.append({
            "doctor_id": str(doc.id),
            "first_name": doc.first_name,
            "last_name": doc.last_name,
            "email": doc.email,
            "specialization": doc.doctor_profile.specialization if doc.doctor_profile else None,
            "total": total,
            "upcoming": upcoming,
            "completed": completed,
            "cancelled": cancelled,
            "pending": pending,
            "today": today_count,
            "is_available": doc.doctor_profile.availability_status if doc.doctor_profile else True,
        })

    # Sort by total appointments desc
    result.sort(key=lambda x: x["total"], reverse=True)
    return result


@router.get("", include_in_schema=False)
@router.get("/")
def list_appointments(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime
    # Validate pagination parameters
    validate_pagination(skip, limit)

    today = datetime.now().date()

    if current_user.role == UserRole.ADMIN:
        records = (
            db.query(Appointment)
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        # Auto-update status for past appointments
        for appt in records:
            try:
                appt_date = datetime.strptime(appt.date, "%Y-%m-%d").date()
                if appt_date < today and appt.status == "upcoming":
                    appt.status = "completed"
                    db.add(appt)
            except:
                pass
        db.commit()
    elif current_user.role == UserRole.DOCTOR:
        # Doctors see appointments directly assigned to them (by doctor_id)
        # OR appointments of their assigned patients (DoctorPatient relation)
        from app.models.models import DoctorPatient
        from sqlalchemy import or_
        assigned_patient_ids = [dp.patient_id for dp in db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == current_user.id,
            DoctorPatient.status == "active"
        ).all()]
        records = (
            db.query(Appointment)
            .filter(
                or_(
                    Appointment.doctor_id == str(current_user.id),
                    Appointment.patient_id.in_(assigned_patient_ids) if assigned_patient_ids else False,
                )
            )
            .order_by(Appointment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        # Auto-update status for past appointments
        for appt in records:
            try:
                appt_date = datetime.strptime(appt.date, "%Y-%m-%d").date()
                if appt_date < today and appt.status == "upcoming":
                    appt.status = "completed"
                    db.add(appt)
            except:
                pass
        db.commit()
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
        # Auto-update status for past appointments
        for appt in records:
            try:
                appt_date = datetime.strptime(appt.date, "%Y-%m-%d").date()
                if appt_date < today and appt.status == "upcoming":
                    appt.status = "completed"
                    db.add(appt)
            except:
                pass
        db.commit()
    # Batch-load all patient info in one query to avoid N+1
    patient_ids = list({str(r.patient_id) for r in records})
    patients = db.query(User).filter(User.id.in_(patient_ids)).all() if patient_ids else []
    patient_map = {str(p.id): {"email": p.email, "first_name": p.first_name, "last_name": p.last_name} for p in patients}
    return [serialize_appointment(
        r,
        patient_email=patient_map.get(str(r.patient_id), {}).get("email"),
        first_name=patient_map.get(str(r.patient_id), {}).get("first_name"),
        last_name=patient_map.get(str(r.patient_id), {}).get("last_name")
    ) for r in records]


@router.post("", status_code=201)
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

    # Auto-assign doctor_id by matching specialization to the booked specialist type
    from app.models.models import DoctorProfile
    matched_doctor = (
        db.query(User)
        .join(DoctorProfile, DoctorProfile.user_id == User.id)
        .filter(
            User.role == UserRole.DOCTOR,
            DoctorProfile.specialization == spec_parts[0],
        )
        .first()
    )

    appt = Appointment(
        id=str(uuid.uuid4()),
        patient_id=str(current_user.id),
        specialist=body.specialist,
        date=body.date,
        time=body.time,
        reason=body.reason,
        status="upcoming",
        doctor_id=str(matched_doctor.id) if matched_doctor else None,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Create notifications for doctor and admin
    try:
        # Notify the assigned doctor
        if matched_doctor:
            create_notification(
                db=db,
                user_id=str(matched_doctor.id),
                notification_type="appointment",
                title="New Appointment Request",
                message=f"A patient has booked an appointment with you for {appt.date} at {appt.time}.",
                related_id=appt.id,
                related_url=f"/dashboard/appointments/{appt.id}"
            )
            logger.info(f"Notification sent to doctor {matched_doctor.id} for appointment {appt.id}")

        # Notify admin
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if admin_user:
            create_notification(
                db=db,
                user_id=str(admin_user.id),
                notification_type="appointment",
                title="New Appointment Booked",
                message=f"{current_user.first_name or current_user.email} booked an appointment with {body.specialist} for {appt.date} at {appt.time}.",
                related_id=appt.id,
                related_url=f"/dashboard/appointments/{appt.id}"
            )
            logger.info(f"Notification sent to admin for appointment {appt.id}")
    except Exception as e:
        logger.warning(f"Failed to create appointment notifications: {str(e)}")

    return serialize_appointment(appt, patient_email=current_user.email, first_name=current_user.first_name, last_name=current_user.last_name)


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
    return serialize_appointment(
        appt,
        patient_email=patient.email if patient else None,
        first_name=patient.first_name if patient else None,
        last_name=patient.last_name if patient else None
    )


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
