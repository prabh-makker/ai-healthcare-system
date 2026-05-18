"""Doctor calendar and availability management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import uuid

from app.db.session import get_db
from app.models.models import User, UserRole, Appointment, DoctorPatient
from app.core.security import get_current_user, require_role

router = APIRouter()

# Working hours: 9-1, 2-4, 5-7 PM (breaks: 1-2, 4-5 PM)
WORKING_HOURS = [
    {"start": 9, "end": 13},   # 9 AM - 1 PM
    {"start": 14, "end": 16},  # 2 PM - 4 PM
    {"start": 17, "end": 19},  # 5 PM - 7 PM
]

SLOT_DURATION_MINUTES = 30


def time_to_minutes(hour: int, minute: int = 0) -> int:
    """Convert time to minutes since midnight."""
    return hour * 60 + minute


def minutes_to_time(minutes: int) -> tuple:
    """Convert minutes since midnight to (hour, minute)."""
    return divmod(minutes, 60)


def is_within_working_hours(hour: int, minute: int = 0) -> bool:
    """Check if time is within any working hour window."""
    time_minutes = time_to_minutes(hour, minute)
    for window in WORKING_HOURS:
        if time_to_minutes(window["start"]) <= time_minutes < time_to_minutes(window["end"]):
            return True
    return False


def get_available_slots(date_str: str, doctor_id: str, db: Session) -> List[dict]:
    """Get available 30-min slots for a doctor on a given date."""
    slots = []

    # Generate all 30-min slots during working hours
    for window in WORKING_HOURS:
        current_minutes = time_to_minutes(window["start"], 0)
        end_minutes = time_to_minutes(window["end"], 0)

        while current_minutes < end_minutes:
            hour, minute = minutes_to_time(current_minutes)
            time_str = f"{hour:02d}:{minute:02d}"

            # Check if this slot is already booked
            existing = db.query(Appointment).filter(
                Appointment.patient_id == Appointment.patient_id,  # any patient
                Appointment.doctor_id == doctor_id,
                Appointment.date == date_str,
                Appointment.time == time_str,
                Appointment.status.in_(["upcoming", "completed"])
            ).first()

            # Also check for doctor's blocked availability (if implemented)
            # For now, just add all slots if not booked
            if not existing:
                slots.append({
                    "time": time_str,
                    "hour": hour,
                    "minute": minute,
                    "available": True,
                })
            else:
                slots.append({
                    "time": time_str,
                    "hour": hour,
                    "minute": minute,
                    "available": False,
                    "booked_by": existing.patient_id,
                })

            current_minutes += SLOT_DURATION_MINUTES

    return slots


@router.get("/doctor-schedule")
def get_doctor_schedule(
    date: str,  # YYYY-MM-DD format
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Get doctor's calendar for a given date with available slots and appointments."""
    try:
        # Validate date format
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get all appointments for this doctor on this date
    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id,
        Appointment.date == date,
    ).all()

    # Get available slots
    slots = get_available_slots(date, str(current_user.id), db)

    # Format appointments
    formatted_appointments = [
        {
            "id": str(appt.id),
            "patient_id": str(appt.patient_id),
            "time": appt.time,
            "specialist": appt.specialist,
            "reason": appt.reason,
            "status": appt.status,
        }
        for appt in appointments
    ]

    # Return working hours info and slots
    return {
        "date": date,
        "working_hours": WORKING_HOURS,
        "breaks": [
            {"start": 13, "end": 14},  # 1-2 PM
            {"start": 16, "end": 17},  # 4-5 PM
        ],
        "slots": slots,
        "appointments": formatted_appointments,
    }


@router.get("/available-slots")
def get_available_slots_for_doctor(
    date: str,  # YYYY-MM-DD format
    doctor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get available appointment slots for a specific doctor (for patient booking)."""
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Verify doctor exists
    doctor = db.query(User).filter(User.id == doctor_id, User.role == UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    slots = get_available_slots(date, doctor_id, db)

    # SECURITY: strip booked_by (patient ID) from slots for non-doctor/non-admin callers
    # Patients must not be able to enumerate other patients' appointment ownership
    is_owner_doctor = str(current_user.id) == doctor_id
    is_admin = current_user.role == UserRole.ADMIN
    if not (is_owner_doctor or is_admin):
        slots = [{k: v for k, v in s.items() if k != "booked_by"} for s in slots]

    return {
        "date": date,
        "doctor_id": doctor_id,
        "doctor_name": f"Dr. {doctor.first_name} {doctor.last_name}" if doctor.first_name else doctor.email,
        "available_slots": [s for s in slots if s["available"]],
        "all_slots": slots,
    }


@router.get("/doctors-availability")
def get_all_doctors_availability(
    date: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get availability for all doctors on a given date (for patient browsing)."""
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get all doctors
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()

    result = []
    for doctor in doctors:
        slots = get_available_slots(date, str(doctor.id), db)
        available_count = sum(1 for s in slots if s["available"])

        result.append({
            "doctor_id": str(doctor.id),
            "name": f"Dr. {doctor.first_name} {doctor.last_name}" if doctor.first_name else doctor.email,
            "specialization": doctor.doctor_profile.specialization if doctor.doctor_profile else None,
            "available_slots_count": available_count,
            "total_slots": len(slots),
        })

    return {
        "date": date,
        "doctors": result,
    }
