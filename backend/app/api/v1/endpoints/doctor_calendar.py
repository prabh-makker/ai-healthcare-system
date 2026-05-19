"""Doctor calendar and availability management endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Tuple
from datetime import datetime, timedelta, date as date_type
import uuid

from app.db.session import get_db
from app.models.models import User, UserRole, Appointment, DoctorPatient, AttendanceLog
from app.core.security import get_current_user, require_role

router = APIRouter()

# Working hours: 9-1, 2-4, 5-7 PM (breaks: 1-2, 4-5 PM)
WORKING_HOURS = [
    {"start": 9, "end": 13},   # 9 AM - 1 PM
    {"start": 14, "end": 16},  # 2 PM - 4 PM
    {"start": 17, "end": 19},  # 5 PM - 7 PM
]

SLOT_DURATION_MINUTES = 30


def normalize_time_to_24h(time_str: str) -> str:
    """Normalize '09:00 AM' / '9:00AM' / '09:00' → '09:00' (24h format)."""
    ts = time_str.strip()
    for fmt in ("%I:%M %p", "%I:%M%p"):
        try:
            return datetime.strptime(ts.upper(), fmt.upper()).strftime("%H:%M")
        except ValueError:
            continue
    # Already 24h or unrecognised — return as-is
    return ts


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


def get_available_slots(date_str: str, doctor_id: str, db: Session) -> Tuple[List[dict], Optional[str]]:
    """
    Get available 30-min slots for a doctor on a given date.
    Returns (slots, unavailability_message).
    If doctor is absent/emergency, returns empty slots + message.
    """
    # Check doctor's attendance status for this date
    attendance = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == doctor_id,
        AttendanceLog.date == date_str
    ).first()

    if attendance and attendance.status in ("absent", "emergency"):
        unavail_label = "Emergency" if attendance.status == "emergency" else "Absent"
        return [], f"Doctor unavailable ({unavail_label})"

    # Pre-fetch all booked appointments for this doctor/date to avoid N+1
    booked_appts = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.date == date_str,
        Appointment.status.in_(["upcoming", "completed"])
    ).all()

    # Build lookup keyed by normalised 24h time string
    booked_map = {normalize_time_to_24h(a.time): a for a in booked_appts}

    slots = []
    for window in WORKING_HOURS:
        current_minutes = time_to_minutes(window["start"], 0)
        end_minutes = time_to_minutes(window["end"], 0)

        while current_minutes < end_minutes:
            hour, minute = minutes_to_time(current_minutes)
            time_str = f"{hour:02d}:{minute:02d}"

            # Check if current slot or any overlapping slot is booked
            booked_appt = booked_map.get(time_str)
            is_available = not booked_appt

            if booked_appt:
                # Slot is booked — unavailable
                slots.append({
                    "time": time_str,
                    "hour": hour,
                    "minute": minute,
                    "available": False,
                    "booked_by": str(booked_appt.patient_id),
                })
            else:
                # Slot is free — available for booking
                slots.append({
                    "time": time_str,
                    "hour": hour,
                    "minute": minute,
                    "available": True,
                })

            current_minutes += SLOT_DURATION_MINUTES

    return slots, None


@router.get("/doctor-schedule")
def get_doctor_schedule(
    date: str,  # YYYY-MM-DD format
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Get doctor's calendar for a given date with available slots and appointments."""
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get all appointments for this doctor on this date
    appointments = db.query(Appointment).filter(
        Appointment.doctor_id == str(current_user.id),
        Appointment.date == date,
    ).all()

    # Batch-load patient info (avoid N+1)
    patient_ids = list({str(a.patient_id) for a in appointments})
    patients = db.query(User).filter(User.id.in_(patient_ids)).all() if patient_ids else []
    patient_map = {
        str(p.id): (
            f"{p.first_name or ''} {p.last_name or ''}".strip() or p.email
        )
        for p in patients
    }

    # Get available slots (already using pre-fetch + normalisation)
    slots, unavailability_msg = get_available_slots(date, str(current_user.id), db)

    # Format appointments — time normalised to 24h so frontend can match slots
    formatted_appointments = [
        {
            "id": str(appt.id),
            "patient_id": str(appt.patient_id),
            "patient_name": patient_map.get(str(appt.patient_id), str(appt.patient_id)),
            "time": normalize_time_to_24h(appt.time),
            "specialist": appt.specialist,
            "reason": appt.reason or "",
            "status": appt.status,
        }
        for appt in appointments
    ]

    return {
        "date": date,
        "working_hours": WORKING_HOURS,
        "breaks": [
            {"start": 13, "end": 14},  # 1-2 PM
            {"start": 16, "end": 17},  # 4-5 PM
        ],
        "slots": slots,
        "unavailable_message": unavailability_msg,
        "appointments": formatted_appointments,
    }


@router.get("/doctor-weekly")
def get_doctor_weekly_summary(
    start_date: str,  # YYYY-MM-DD — first day of the 7-day window
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Return appointment counts per day for 7 days starting from start_date."""
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    result = []
    for i in range(7):
        day = start + timedelta(days=i)
        day_str = day.isoformat()
        count = db.query(Appointment).filter(
            Appointment.doctor_id == str(current_user.id),
            Appointment.date == day_str,
            Appointment.status.in_(["upcoming", "completed"]),
        ).count()
        result.append({"date": day_str, "count": count})

    return {"start_date": start_date, "days": result}


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

    slots, unavailability_msg = get_available_slots(date, doctor_id, db)

    # SECURITY: strip booked_by (patient ID) for non-owner/non-admin callers
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
        "unavailable_message": unavailability_msg,
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

    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()

    result = []
    for doctor in doctors:
        slots, unavailability_msg = get_available_slots(date, str(doctor.id), db)
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
