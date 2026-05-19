#!/usr/bin/env python3
"""Seed initial attendance records for demo doctors."""

from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import uuid

from app.db.session import SessionLocal
from app.models.models import User, AttendanceLog, UserRole

def uuid4_str():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

def seed_attendance():
    """Create sample attendance records for doctors."""
    db = SessionLocal()

    # Get all doctors
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()
    print(f"Found {len(doctors)} doctors")

    if not doctors:
        print("No doctors found. Seed user data first.")
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Create attendance for last 10 days
    for i in range(10):
        date = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")

        for j, doctor in enumerate(doctors):
            # Check if already exists
            existing = db.query(AttendanceLog).filter(
                AttendanceLog.user_id == doctor.id,
                AttendanceLog.date == date
            ).first()

            if existing:
                print(f"  Attendance already exists for {doctor.email} on {date}")
                continue

            # Vary status: mostly present, some absences, some leaves
            if i == 0:
                # Today — no record yet (will be marked by user)
                continue
            elif (i + j) % 7 == 0:
                status = "leave"
            elif (i + j) % 5 == 0:
                status = "absent"
            elif (i + j) % 11 == 0:
                status = "emergency"
            else:
                status = "present"

            # Create attendance record
            log = AttendanceLog(
                id=uuid4_str(),
                user_id=doctor.id,
                date=date,
                status=status,
                notes=f"Auto-seeded {status}" if status != "present" else None,
                marked_at=utc_now(),
                created_at=utc_now(),
            )
            db.add(log)
            print(f"  ✓ {doctor.first_name or doctor.email} — {date}: {status}")

    db.commit()
    print("\nAttendance seeding complete!")
    db.close()

if __name__ == "__main__":
    seed_attendance()
