"""Seed extended mock data: extra users + medical records + appointments."""
from app.db.session import SessionLocal
from app.models.models import (
    User, UserRole, DoctorProfile, PatientProfile,
    MedicalRecord, Appointment
)
from app.core.security import get_password_hash
import uuid
from datetime import datetime, timedelta, timezone
import random


PATIENTS = [
    ("alice@healthai.com", "Patient@123", "Alice Anderson", "A+", "1985-04-12", ["Hypertension"]),
    ("bob@healthai.com", "Patient@123", "Bob Brown", "O-", "1978-09-23", ["Diabetes Type 2"]),
    ("carol@healthai.com", "Patient@123", "Carol Chen", "B+", "1992-02-08", []),
    ("david@healthai.com", "Patient@123", "David Davis", "AB+", "1965-11-30", ["Asthma", "Hypertension"]),
    ("eva@healthai.com", "Patient@123", "Eva Evans", "O+", "2001-07-15", []),
]

DOCTORS = [
    ("dr.smith@healthai.com", "Doctor@123", "Dr. Sarah Smith", "Cardiologist"),
    ("dr.jones@healthai.com", "Doctor@123", "Dr. Michael Jones", "Neurologist"),
    ("dr.patel@healthai.com", "Doctor@123", "Dr. Priya Patel", "Dermatologist"),
    ("dr.kim@healthai.com", "Doctor@123", "Dr. James Kim", "Pediatrician"),
]

DIAGNOSES = [
    ("Common Cold", "General Physician", 87.4, ["cough", "sore throat", "fatigue"]),
    ("Migraine", "Neurologist", 91.2, ["headache", "nausea", "light sensitivity"]),
    ("Hypertension", "Cardiologist", 94.6, ["dizziness", "chest pressure"]),
    ("Eczema", "Dermatologist", 88.1, ["skin rash", "itching", "redness"]),
    ("Bronchitis", "Pulmonologist", 89.5, ["persistent cough", "chest congestion"]),
    ("Acid Reflux", "Gastroenterologist", 85.7, ["heartburn", "regurgitation"]),
    ("Anxiety Disorder", "Psychiatrist", 90.3, ["restlessness", "rapid heartbeat", "trouble sleeping"]),
    ("Type 2 Diabetes", "Endocrinologist", 96.1, ["frequent urination", "increased thirst", "fatigue"]),
]


def seed():
    db = SessionLocal()
    created_patient_ids = []
    created_doctor_ids = []

    try:
        # Create patients with profiles
        for email, password, name, blood, dob, conditions in PATIENTS:
            if db.query(User).filter(User.email == email).first():
                user = db.query(User).filter(User.email == email).first()
                created_patient_ids.append(user.id)
                continue
            uid = str(uuid.uuid4())
            db.add(User(
                id=uid, email=email,
                hashed_password=get_password_hash(password),
                role=UserRole.PATIENT, is_active=True
            ))
            db.flush()
            db.add(PatientProfile(
                id=str(uuid.uuid4()), user_id=uid,
                date_of_birth=datetime.fromisoformat(dob),
                blood_group=blood,
                chronic_conditions=conditions,
                emergency_contact=f"98{random.randint(10000000, 99999999)}"
            ))
            created_patient_ids.append(uid)
            print(f"+ Patient: {email}")

        # Create doctors with profiles
        for email, password, name, spec in DOCTORS:
            if db.query(User).filter(User.email == email).first():
                user = db.query(User).filter(User.email == email).first()
                created_doctor_ids.append(user.id)
                continue
            uid = str(uuid.uuid4())
            db.add(User(
                id=uid, email=email,
                hashed_password=get_password_hash(password),
                role=UserRole.DOCTOR, is_active=True
            ))
            db.flush()
            db.add(DoctorProfile(
                id=str(uuid.uuid4()), user_id=uid,
                specialization=spec,
                availability_status=True
            ))
            created_doctor_ids.append(uid)
            print(f"+ Doctor: {email}")

        # Include existing default users
        default_patient = db.query(User).filter(User.email == "patient@healthai.com").first()
        default_doctor = db.query(User).filter(User.email == "doctor@healthai.com").first()
        if default_patient: created_patient_ids.append(default_patient.id)
        if default_doctor: created_doctor_ids.append(default_doctor.id)

        # Generate medical records (mix of past + recent)
        statuses = ["completed", "pending", "reviewed"]
        record_count = 0
        for pid in created_patient_ids:
            n_records = random.randint(2, 5)
            for _ in range(n_records):
                diag, spec, score, symptoms = random.choice(DIAGNOSES)
                days_ago = random.randint(1, 90)
                db.add(MedicalRecord(
                    id=str(uuid.uuid4()),
                    patient_id=pid,
                    doctor_id=random.choice(created_doctor_ids) if created_doctor_ids and random.random() > 0.3 else None,
                    symptoms=symptoms,
                    ai_prediction=diag,
                    confidence_score=score + random.uniform(-3, 3),
                    recommended_specialist=spec,
                    created_at=datetime.now(timezone.utc) - timedelta(days=days_ago, hours=random.randint(0, 23)),
                    status=random.choice(statuses),
                    doctor_notes=f"Patient reported {symptoms[0]}. Recommend follow-up in 2 weeks." if random.random() > 0.5 else None
                ))
                record_count += 1

        # Generate appointments (upcoming + past)
        specialists = ["Cardiologist", "Neurologist", "Dermatologist", "Pediatrician", "General Physician"]
        reasons = ["Routine checkup", "Follow-up consultation", "Symptom review", "Test results review", "Initial consultation"]
        appt_count = 0
        for pid in created_patient_ids:
            for _ in range(random.randint(1, 3)):
                days_offset = random.randint(-30, 60)  # past or future
                date_obj = datetime.now() + timedelta(days=days_offset)
                status = "completed" if days_offset < 0 else ("upcoming" if days_offset > 0 else "today")
                db.add(Appointment(
                    id=str(uuid.uuid4()),
                    patient_id=pid,
                    specialist=random.choice(specialists),
                    date=date_obj.strftime("%Y-%m-%d"),
                    time=f"{random.randint(9, 17):02d}:{random.choice(['00', '30'])}",
                    status=status,
                    reason=random.choice(reasons)
                ))
                appt_count += 1

        db.commit()
        print(f"\nDone. {record_count} records + {appt_count} appointments created.")
        print(f"Total users: {len(created_patient_ids)} patients, {len(created_doctor_ids)} doctors")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
