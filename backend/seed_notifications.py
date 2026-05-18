"""Seed notifications for all users (patients, doctors, admins)."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
import random
import uuid

from app.db.session import SessionLocal
from app.models.models import User, Notification

NOTIF_TEMPLATES = {
    "PATIENT": [
        ("prescription", "New Prescription", "Dr. Sharma prescribed Atenolol 50mg. Take as directed.", False),
        ("appointment", "Appointment Confirmed", "Your appointment with Cardiologist on 2026-06-15 at 14:30 is confirmed.", False),
        ("record", "Diagnosis Approved", "Your recent symptom analysis was reviewed by Dr. Sharma.", True),
        ("appointment", "Appointment Reminder", "You have an upcoming appointment tomorrow at 10:00 AM.", False),
        ("message", "Message from Doctor", "Dr. Sharma sent you a message about your treatment plan.", True),
        ("prescription", "Prescription Refill Due", "Your Aspirin prescription needs refill in 3 days.", False),
    ],
    "DOCTOR": [
        ("approval", "New Diagnosis Pending", "Patient Aarav Kumar submitted new symptoms for review.", False),
        ("appointment", "New Appointment Booked", "Aarav Kumar booked appointment for 2026-06-15 14:30.", False),
        ("message", "Patient Message", "Arjun Menon sent you a message about prescription.", False),
        ("record", "Record Update", "Patient record updated by lab system.", True),
        ("approval", "Urgent Review Required", "High-confidence diagnosis pending your approval.", False),
    ],
    "ADMIN": [
        ("system", "New User Registration", "5 new patients registered today.", False),
        ("system", "System Health", "All services operational. 99.9% uptime.", True),
        ("audit", "Suspicious Login", "Multiple failed login attempts detected.", False),
        ("system", "Database Backup", "Nightly backup completed successfully.", True),
    ],
}


def seed_notifications():
    db = SessionLocal()
    try:
        # Clear existing notifications
        deleted = db.query(Notification).delete()
        print(f"Cleared {deleted} existing notifications")

        users = db.query(User).all()
        created_count = 0

        for user in users:
            templates = NOTIF_TEMPLATES.get(user.role, NOTIF_TEMPLATES["PATIENT"])
            for i, (n_type, title, message, is_read) in enumerate(templates):
                # Spread created_at across last 7 days
                hours_ago = random.randint(1, 168)
                created_at = datetime.utcnow() - timedelta(hours=hours_ago)
                notif = Notification(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    type=n_type,
                    title=title,
                    message=message,
                    is_read=is_read,
                    created_at=created_at,
                )
                db.add(notif)
                created_count += 1

        db.commit()
        print(f"Created {created_count} notifications for {len(users)} users")

        # Show summary per user
        for user in users[:5]:
            unread = db.query(Notification).filter_by(user_id=user.id, is_read=False).count()
            total = db.query(Notification).filter_by(user_id=user.id).count()
            print(f"  {user.email} ({user.role}): {total} total, {unread} unread")
    finally:
        db.close()


if __name__ == "__main__":
    seed_notifications()
