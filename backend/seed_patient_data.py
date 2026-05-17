"""Seed sample data for a specific patient to make their dashboard look complete.

Usage:
    python seed_patient_data.py [patient_email]

Default: testuser@test.com

Creates:
- Doctor-patient assignment (testuser -> Dr. Doctor)
- 3 sample prescriptions
- 5 notifications (mix of types)
- Cleans up duplicate/orphaned data
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.models import User, Prescription, Notification, DoctorPatient, Appointment

PATIENT_EMAIL = sys.argv[1] if len(sys.argv) > 1 else "testuser@test.com"

db = SessionLocal()

# Find patient
patient = db.query(User).filter(User.email == PATIENT_EMAIL).first()
if not patient:
    print(f"[FAIL] Patient {PATIENT_EMAIL} not found")
    sys.exit(1)
print(f"Patient: {patient.email} ({patient.id})")

# Find first available doctor
doctor = db.query(User).filter(User.role == "DOCTOR", User.email == "doctor@healthai.com").first()
if not doctor:
    print("[FAIL] Default doctor not found")
    sys.exit(1)
print(f"Doctor: {doctor.email} ({doctor.id})")

# 1. Create doctor-patient assignment if not exists
existing = db.query(DoctorPatient).filter(
    DoctorPatient.doctor_id == doctor.id,
    DoctorPatient.patient_id == patient.id
).first()
if not existing:
    assignment = DoctorPatient(
        id=str(uuid.uuid4()),
        doctor_id=doctor.id,
        patient_id=patient.id,
        status="active",
    )
    db.add(assignment)
    db.commit()
    print("[OK] Created doctor-patient assignment")
else:
    print("[OK] Doctor-patient assignment already exists")

# 2. Clean up old prescriptions for this patient (for clean seed)
db.query(Prescription).filter(Prescription.patient_id == patient.id).delete()
db.commit()

# 3. Create sample prescriptions
prescriptions = [
    {
        "medication_name": "Paracetamol",
        "dosage": "500mg",
        "frequency": "Twice daily after meals",
        "instructions": "Take with food. Do not exceed 4 tablets in 24 hours.",
        "status": "active",
    },
    {
        "medication_name": "Amoxicillin",
        "dosage": "250mg",
        "frequency": "Three times daily",
        "instructions": "Complete the full course even if you feel better. Take 8 hours apart.",
        "status": "active",
    },
    {
        "medication_name": "Ibuprofen",
        "dosage": "400mg",
        "frequency": "As needed for pain",
        "instructions": "Max 3 times per day. Take with water and food.",
        "status": "completed",
    },
]

now = datetime.now(timezone.utc)
for i, p in enumerate(prescriptions):
    rx = Prescription(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        doctor_id=doctor.id,
        medication_name=p["medication_name"],
        dosage=p["dosage"],
        frequency=p["frequency"],
        instructions=p["instructions"],
        start_date=now - timedelta(days=10 - i*3),
        end_date=now + timedelta(days=7 - i*3),
        status=p["status"],
    )
    db.add(rx)
db.commit()
print(f"[OK] Created {len(prescriptions)} prescriptions")

# 4. Clean up old notifications for this patient
db.query(Notification).filter(Notification.user_id == patient.id).delete()
db.commit()

# 5. Create sample notifications
notifications = [
    {
        "type": "prescription",
        "title": "New Prescription",
        "message": "Dr. Doctor prescribed Paracetamol for you. Tap to view.",
        "related_url": "/dashboard/medications",
        "is_read": False,
    },
    {
        "type": "appointment",
        "title": "Appointment Reminder",
        "message": "You have an upcoming appointment with Dr. Doctor tomorrow at 10:00 AM.",
        "related_url": "/dashboard/appointments",
        "is_read": False,
    },
    {
        "type": "record",
        "title": "Medical Record Updated",
        "message": "Your medical record has been reviewed and approved by Dr. Doctor.",
        "related_url": "/dashboard/records",
        "is_read": True,
    },
    {
        "type": "system",
        "title": "Welcome to HealthAI!",
        "message": "Start by sharing your symptoms in the AI Diagnostics chat.",
        "related_url": "/dashboard/symptoms",
        "is_read": True,
    },
    {
        "type": "medication",
        "title": "Medication Reminder",
        "message": "Time to take your Amoxicillin (250mg). Don't forget!",
        "related_url": "/dashboard/medications",
        "is_read": False,
    },
]

for i, n in enumerate(notifications):
    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=patient.id,
        type=n["type"],
        title=n["title"],
        message=n["message"],
        related_url=n["related_url"],
        is_read=n["is_read"],
        created_at=now - timedelta(hours=i*2),
    )
    db.add(notif)
db.commit()
print(f"[OK] Created {len(notifications)} notifications")

# 6. Clean up old appointments for this patient (clean seed)
db.query(Appointment).filter(Appointment.patient_id == patient.id).delete()
db.commit()

# 7. Create sample appointments
appointments = [
    {
        "specialist": "General Physician",
        "date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
        "time": "10:00 AM",
        "status": "upcoming",
        "reason": "Follow-up consultation for prescribed medications",
    },
    {
        "specialist": "Cardiology",
        "date": (now - timedelta(days=15)).strftime("%Y-%m-%d"),
        "time": "02:00 PM",
        "status": "completed",
        "reason": "Routine heart checkup",
    },
]

for a in appointments:
    appt = Appointment(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        specialist=a["specialist"],
        date=a["date"],
        time=a["time"],
        status=a["status"],
        reason=a["reason"],
        created_at=now - timedelta(days=2),
    )
    db.add(appt)
db.commit()
print(f"[OK] Created {len(appointments)} appointments")

db.close()
print("\n[DONE] Patient dashboard seeded with clean data")
