"""Medications endpoint - alias to prescriptions with patient-friendly naming."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List

from app.db.session import get_db
from app.models.models import User, Prescription
from app.schemas.prescription import PrescriptionOut
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=List[PrescriptionOut])
@router.get("/", response_model=List[PrescriptionOut])
def list_medications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """
    List medications (prescriptions) for current user.
    Filtered by role:
    - Doctors see prescriptions they created
    - Patients see their own prescriptions
    - Admins see all prescriptions
    """
    if current_user.role == "DOCTOR":
        query = db.query(Prescription).filter(Prescription.doctor_id == current_user.id)
    elif current_user.role == "PATIENT":
        query = db.query(Prescription).filter(Prescription.patient_id == current_user.id)
    else:
        query = db.query(Prescription)

    return query.offset(skip).limit(limit).all()


@router.get("/{medication_id}", response_model=PrescriptionOut)
def get_medication(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    medication_id: str = None,
) -> Any:
    """Get a specific medication/prescription by ID."""
    medication = db.query(Prescription).filter(Prescription.id == medication_id).first()

    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Check authorization
    if current_user.role == "DOCTOR" and current_user.id != medication.doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this medication")
    elif current_user.role == "PATIENT" and current_user.id != medication.patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this medication")
    elif current_user.role not in ["DOCTOR", "PATIENT", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return medication
