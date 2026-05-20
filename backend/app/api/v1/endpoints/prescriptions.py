from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Any, List
import logging

from datetime import datetime, timedelta
from pydantic import BaseModel

from app.db.session import get_db
from app.models.models import User, Prescription, DoctorPatient, MedicationLog
from app.schemas.prescription import PrescriptionCreate, PrescriptionUpdate, PrescriptionOut
from app.core.security import get_current_user
from app.api.v1.endpoints.notifications import create_notification


class MedicationLogCreate(BaseModel):
    notes: str = ""

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("", response_model=PrescriptionOut, status_code=201)
@router.post("/", response_model=PrescriptionOut, status_code=201)
def create_prescription(
    prescription_in: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create a new prescription.
    Only doctors can prescribe, and only to patients they're assigned to.
    """
    # Validate: current user is DOCTOR
    if current_user.role != "DOCTOR":
        raise HTTPException(status_code=403, detail="Only doctors can prescribe medications")

    # Validate: doctor assigned to patient
    assignment = db.query(DoctorPatient).filter(
        DoctorPatient.doctor_id == current_user.id,
        DoctorPatient.patient_id == prescription_in.patient_id,
        DoctorPatient.status == "active"
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this patient. Cannot prescribe."
        )

    # Create prescription
    db_prescription = Prescription(
        patient_id=prescription_in.patient_id,
        doctor_id=current_user.id,
        medication_name=prescription_in.medication_name,
        dosage=prescription_in.dosage,
        frequency=prescription_in.frequency,
        instructions=prescription_in.instructions,
        start_date=prescription_in.start_date,
        end_date=prescription_in.end_date,
    )

    try:
        db.add(db_prescription)
        db.commit()
        db.refresh(db_prescription)
        logger.info(f"Prescription created: {db_prescription.id} by doctor {current_user.id}")

        # Create notification for patient
        try:
            create_notification(
                db=db,
                user_id=prescription_in.patient_id,
                notification_type="prescription",
                title="New Prescription",
                message=f"Dr. {current_user.email.split('@')[0]} prescribed {prescription_in.medication_name}",
                related_id=str(db_prescription.id),
                related_url="/dashboard/medications",
            )
        except Exception as notif_err:
            logger.warning(f"Failed to create notification: {notif_err}")

        return db_prescription
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating prescription: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating prescription")


@router.get("", response_model=List[PrescriptionOut])
@router.get("/", response_model=List[PrescriptionOut])
def list_prescriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """
    List prescriptions. Filtered by role:
    - Doctors see prescriptions they created
    - Patients see their own prescriptions
    - Admins see all prescriptions
    """
    if current_user.role == "DOCTOR":
        # Doctors see prescriptions they created
        query = db.query(Prescription).filter(Prescription.doctor_id == current_user.id)
    elif current_user.role == "PATIENT":
        # Patients see their own prescriptions
        query = db.query(Prescription).filter(Prescription.patient_id == current_user.id)
    else:
        # Admins see all
        query = db.query(Prescription)

    return query.offset(skip).limit(limit).all()


@router.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(
    prescription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Get a specific prescription by ID.
    Authorization: Doctor (if they created it), Patient (if it's theirs), or Admin
    """
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Check authorization
    if current_user.role == "DOCTOR" and current_user.id != prescription.doctor_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this prescription")
    elif current_user.role == "PATIENT" and current_user.id != prescription.patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this prescription")
    elif current_user.role not in ["DOCTOR", "PATIENT", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    return prescription


@router.patch("/{prescription_id}", response_model=PrescriptionOut)
def update_prescription(
    prescription_id: str,
    update_in: PrescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update a prescription. Only the prescribing doctor can update.
    Can update: status, end_date, instructions
    """
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Only doctor who prescribed can update
    if current_user.id != prescription.doctor_id:
        raise HTTPException(status_code=403, detail="Only the prescribing doctor can update this prescription")

    # Validate status whitelist + transitions
    VALID_STATUSES = {"active", "completed", "discontinued"}
    # Allowed forward transitions (no going back to active from completed/discontinued)
    ALLOWED_TRANSITIONS = {
        "active": {"active", "completed", "discontinued"},
        "completed": {"completed"},
        "discontinued": {"discontinued"},
    }
    old_status = prescription.status or "active"
    if update_in.status:
        if update_in.status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
        current_status = prescription.status or "active"
        if update_in.status not in ALLOWED_TRANSITIONS.get(current_status, set()):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition prescription from '{current_status}' to '{update_in.status}'"
            )
        prescription.status = update_in.status
    if update_in.end_date:
        prescription.end_date = update_in.end_date
    if update_in.instructions:
        prescription.instructions = update_in.instructions

    try:
        db.commit()
        db.refresh(prescription)
        logger.info(f"Prescription updated: {prescription.id}")

        # Create notification for patient if prescription status changed to discontinued
        if update_in.status == "discontinued":
            try:
                create_notification(
                    db=db,
                    user_id=prescription.patient_id,
                    notification_type="prescription",
                    title="Prescription Discontinued",
                    message=f"Your prescription for {prescription.medication_name} has been discontinued by Dr. {current_user.email.split('@')[0]}",
                    related_id=str(prescription.id),
                    related_url="/dashboard/prescriptions",
                )
            except Exception as notif_err:
                logger.warning(f"Failed to create discontinuation notification: {notif_err}")

        return prescription
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating prescription: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating prescription")


@router.delete("/{prescription_id}", status_code=204)
def delete_prescription(
    prescription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Delete a prescription. Only the prescribing doctor can delete.
    """
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    if current_user.id != prescription.doctor_id:
        raise HTTPException(status_code=403, detail="Only the prescribing doctor can delete this prescription")

    try:
        db.delete(prescription)
        db.commit()
        logger.info(f"Prescription deleted: {prescription_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting prescription: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error deleting prescription")


@router.post("/{prescription_id}/log", status_code=201)
def log_medication_taken(
    prescription_id: str,
    body: MedicationLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Patient marks a medication as taken."""
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Only the patient can log
    if current_user.role != "PATIENT" or str(prescription.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the patient can log medication intake")

    log = MedicationLog(
        prescription_id=prescription_id,
        patient_id=current_user.id,
        status="taken",
        notes=body.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "id": log.id,
        "prescription_id": log.prescription_id,
        "taken_at": log.taken_at.isoformat(),
        "status": log.status,
    }


@router.get("/{prescription_id}/logs")
def get_medication_logs(
    prescription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Any]:
    """Get medication intake logs for a prescription."""
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Patient sees own logs; Doctor sees if they prescribed
    if current_user.role == "PATIENT" and str(prescription.patient_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    if current_user.role == "DOCTOR" and str(prescription.doctor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")

    logs = (
        db.query(MedicationLog)
        .filter(MedicationLog.prescription_id == prescription_id)
        .order_by(MedicationLog.taken_at.desc())
        .limit(30)
        .all()
    )

    return [
        {
            "id": log.id,
            "taken_at": log.taken_at.isoformat(),
            "status": log.status,
            "notes": log.notes,
        }
        for log in logs
    ]


@router.get("/adherence/summary")
def get_adherence_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get adherence summary for the current patient (last 7 days)."""
    if current_user.role != "PATIENT":
        raise HTTPException(status_code=403, detail="Only patients can view adherence")

    # Get active prescriptions
    active_prescriptions = (
        db.query(Prescription)
        .filter(
            Prescription.patient_id == current_user.id,
            Prescription.status == "active"
        )
        .all()
    )

    # Get logs from last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    logs = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.patient_id == current_user.id,
            MedicationLog.taken_at >= seven_days_ago,
        )
        .all()
    )

    # Group logs by prescription
    log_counts: dict = {}
    for log in logs:
        log_counts[str(log.prescription_id)] = log_counts.get(str(log.prescription_id), 0) + 1

    return {
        "active_prescriptions": len(active_prescriptions),
        "logs_this_week": len(logs),
        "per_medication": [
            {
                "prescription_id": str(p.id),
                "medication_name": p.medication_name,
                "logs_count": log_counts.get(str(p.id), 0),
            }
            for p in active_prescriptions
        ],
    }
