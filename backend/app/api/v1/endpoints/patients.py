from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.session import get_db
from app.models.models import User, PatientProfile, UserRole
from app.core.security import get_current_user, require_role

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
    return [_serialize_profile(p, p.patient_profile) for p in patients]
