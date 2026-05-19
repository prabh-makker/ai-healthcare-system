from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime
import logging

from app.db.session import get_db
from app.models.models import User, PatientProfile, UserRole, DoctorPatient, MedicalRecord, Appointment
from app.core.security import get_current_user, require_role
from sqlalchemy import func

logger = logging.getLogger(__name__)

router = APIRouter()


class PatientProfileUpdate(BaseModel):
    date_of_birth: Optional[datetime] = None
    blood_group: Optional[str] = None
    chronic_conditions: Optional[List[str]] = None
    emergency_contact: Optional[str] = None


def _serialize_profile(user: User, profile: Optional[PatientProfile]) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "profile": {
            "date_of_birth": profile.date_of_birth.isoformat() if profile and profile.date_of_birth else None,
            "blood_group": profile.blood_group if profile else None,
            "chronic_conditions": profile.chronic_conditions if profile else [],
            "emergency_contact": profile.emergency_contact if profile else None,
        } if profile else None,
    }


@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = current_user.patient_profile
    return _serialize_profile(current_user, profile)


@router.post("/me")
def update_my_profile(
    body: PatientProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import uuid
    from datetime import datetime

    profile = current_user.patient_profile
    if not profile:
        profile = PatientProfile(id=uuid.uuid4(), user_id=current_user.id)
        db.add(profile)

    # Validate input fields
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is None:
            setattr(profile, field, value)
            continue

        # Validate date_of_birth - must be in past
        if field == "date_of_birth" and isinstance(value, datetime):
            if value > datetime.now():
                raise HTTPException(status_code=400, detail="Date of birth cannot be in the future")

        # Validate blood_group - must be valid type
        if field == "blood_group" and isinstance(value, str):
            valid_groups = {"O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"}
            if value and value.upper() not in valid_groups:
                raise HTTPException(status_code=400, detail=f"Invalid blood group. Must be one of: {', '.join(valid_groups)}")

        setattr(profile, field, value)

    db.commit()
    db.refresh(current_user)
    return _serialize_profile(current_user, current_user.patient_profile)


@router.get("/admin/doctors-overview")
def admin_doctors_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: list all doctors with patient counts, record counts."""
    doctors = db.query(User).filter(
        User.role == UserRole.DOCTOR, User.is_active == True
    ).all()

    # Batch-load doctor profiles (avoid N+1)
    from app.models.models import DoctorProfile
    doctor_ids = [d.id for d in doctors]
    profiles = {p.user_id: p for p in db.query(DoctorProfile).filter(DoctorProfile.user_id.in_(doctor_ids)).all()} if doctor_ids else {}

    # Single grouped query per metric instead of N per doctor
    patient_counts = dict(db.query(DoctorPatient.doctor_id, func.count(DoctorPatient.id)).filter(
        DoctorPatient.status == "active"
    ).group_by(DoctorPatient.doctor_id).all())

    record_counts = dict(db.query(MedicalRecord.doctor_id, func.count(MedicalRecord.id)).filter(
        MedicalRecord.doctor_id.isnot(None)
    ).group_by(MedicalRecord.doctor_id).all())

    pending_counts = dict(db.query(MedicalRecord.doctor_id, func.count(MedicalRecord.id)).filter(
        MedicalRecord.status == "pending", MedicalRecord.doctor_id.isnot(None)
    ).group_by(MedicalRecord.doctor_id).all())

    return [{
        "id": str(doc.id),
        "email": doc.email,
        "name": doc.email.split("@")[0].replace(".", " ").title(),
        "specialization": profiles.get(doc.id, {}).specialization if profiles.get(doc.id) else "General",
        "is_available": profiles.get(doc.id, {}).availability_status if profiles.get(doc.id) else True,
        "patient_count": patient_counts.get(doc.id, 0),
        "record_count": record_counts.get(doc.id, 0),
        "pending_approvals": pending_counts.get(doc.id, 0),
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    } for doc in doctors]


@router.get("/admin/all-users")
def admin_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: list all users grouped by role."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [{
        "id": str(u.id),
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "role": u.role.value,
        "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]


@router.get("/list")
def list_patients(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("DOCTOR", "ADMIN")),
):
    # Validate pagination parameters
    if skip < 0:
        raise HTTPException(status_code=400, detail="skip must be >= 0")
    if limit <= 0 or limit > 100:
        limit = min(limit, 100) if limit > 0 else 50

    patients = (
        db.query(User)
        .filter(User.role == UserRole.PATIENT, User.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Batch-load patient profiles (avoid N+1)
    patient_ids = [p.id for p in patients]
    profiles = {p.user_id: p for p in db.query(PatientProfile).filter(PatientProfile.user_id.in_(patient_ids)).all()} if patient_ids else {}

    return [_serialize_profile(p, profiles.get(p.id)) for p in patients]


@router.get("/my-patients")
def get_my_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """
    Get all patients assigned to this doctor.
    Only doctors can call this endpoint.
    """
    if current_user.role != "DOCTOR":
        raise HTTPException(status_code=403, detail="Only doctors can view their assigned patients")

    # Get all active assignments for this doctor
    assignments = (
        db.query(DoctorPatient)
        .filter(
            DoctorPatient.doctor_id == current_user.id,
            DoctorPatient.status == "active"
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Batch-load patients and profiles in one query each (avoid N+1)
    patient_ids = [a.patient_id for a in assignments]
    patients = {p.id: p for p in db.query(User).filter(User.id.in_(patient_ids)).all()} if patient_ids else {}
    profiles = {p.user_id: p for p in db.query(PatientProfile).filter(PatientProfile.user_id.in_(patient_ids)).all()} if patient_ids else {}

    # Build patient objects with profile info
    result = []
    for assignment in assignments:
        patient = patients.get(assignment.patient_id)
        profile = profiles.get(assignment.patient_id)

        if patient:
            result.append({
                "id": patient.id,
                "email": patient.email,
                "first_name": patient.first_name or "",
                "last_name": patient.last_name or "",
                "name": f"{patient.first_name or ''} {patient.last_name or ''}".strip() or patient.email.split("@")[0],
                "chronic_conditions": profile.chronic_conditions if profile else [],
                "blood_group": profile.blood_group if profile else None,
                "assigned_date": assignment.assigned_date.isoformat() if assignment.assigned_date else None,
                "emergency_contact": profile.emergency_contact if profile else None,
            })

    return result


@router.post("/assign/{patient_id}/{doctor_id}")
def assign_patient_to_doctor(
    patient_id: str,
    doctor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Assign a patient to a doctor. Only admins can do this.
    """
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can assign patients to doctors")

    # Verify patient exists and is actually a patient
    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient or patient.role != "PATIENT":
        raise HTTPException(status_code=404, detail="Patient not found")

    # Verify doctor exists and is actually a doctor
    doctor = db.query(User).filter(User.id == doctor_id).first()
    if not doctor or doctor.role != "DOCTOR":
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check if already assigned and active
    existing = (
        db.query(DoctorPatient)
        .filter(
            DoctorPatient.doctor_id == doctor_id,
            DoctorPatient.patient_id == patient_id,
            DoctorPatient.status == "active"
        )
        .first()
    )

    if existing:
        raise HTTPException(status_code=400, detail="Patient is already assigned to this doctor")

    # Create assignment
    try:
        assignment = DoctorPatient(
            doctor_id=doctor_id,
            patient_id=patient_id,
            status="active"
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        logger.info(f"Patient {patient_id} assigned to doctor {doctor_id}")
        return {
            "id": assignment.id,
            "doctor_id": assignment.doctor_id,
            "patient_id": assignment.patient_id,
            "assigned_date": assignment.assigned_date.isoformat(),
            "status": assignment.status,
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error assigning patient: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error assigning patient")
