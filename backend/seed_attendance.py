"""Seed attendance data from the start of the month to present."""
from app.db.session import SessionLocal
from app.models.models import User, UserRole, AttendanceLog
from datetime import datetime, timedelta, date
import uuid
import random

def seed_attendance():
    db = SessionLocal()
    try:
        # Get all doctors
        doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()
        if not doctors:
            print("No doctors found. Run seed_db.py first.")
            return

        # Get current month's start and today
        today = date.today()
        month_start = date(today.year, today.month, 1)

        print(f"Seeding attendance data from {month_start} to {today}")

        # Clear existing attendance for this month
        db.query(AttendanceLog).filter(
            AttendanceLog.date >= month_start.isoformat(),
            AttendanceLog.date <= today.isoformat()
        ).delete()

        # Define statuses with probability weights
        statuses = ["present", "present", "present", "present", "present", "absent", "half_day"]

        # Seed attendance for each doctor
        for doctor in doctors:
            current_date = month_start

            while current_date <= today:
                # Check if it's weekend (Saturday=5, Sunday=6)
                is_weekend = current_date.weekday() >= 5

                if is_weekend:
                    # Weekends - mark as leave
                    status = "leave"
                    notes = "Weekend"
                else:
                    # Weekday - random status with bias towards present
                    status = random.choice(statuses)
                    notes = None
                    if status == "absent":
                        notes = "Unplanned absence"
                    elif status == "half_day":
                        notes = "Half day - personal work"

                # Create attendance log
                attendance = AttendanceLog(
                    id=str(uuid.uuid4()),
                    user_id=str(doctor.id),
                    date=current_date.isoformat(),
                    status=status,
                    marked_at=datetime.now().isoformat(),
                    notes=notes,
                )
                db.add(attendance)

                current_date += timedelta(days=1)

        db.commit()

        # Count records created
        total = db.query(AttendanceLog).filter(
            AttendanceLog.date >= month_start.isoformat(),
            AttendanceLog.date <= today.isoformat()
        ).count()

        print(f"\n✓ Seeded {total} attendance records")
        print(f"  Doctors: {len(doctors)}")
        print(f"  Date range: {month_start} to {today}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_attendance()
