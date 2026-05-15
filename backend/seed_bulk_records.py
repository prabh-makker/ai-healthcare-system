"""Bulk seed: 50+ medical records + 30+ appointments for existing patients."""
from app.db.session import SessionLocal
from app.models.models import User, UserRole, MedicalRecord, Appointment
from datetime import datetime, timedelta, timezone
import uuid
import random


DIAGNOSES = [
    ("Common Cold", "General Physician", 87.4, ["cough", "sore throat", "fatigue", "runny nose"]),
    ("Migraine", "Neurologist", 91.2, ["headache", "nausea", "light sensitivity"]),
    ("Hypertension", "Cardiologist", 94.6, ["dizziness", "chest pressure", "blurred vision"]),
    ("Eczema", "Dermatologist", 88.1, ["skin rash", "itching", "redness"]),
    ("Bronchitis", "Pulmonologist", 89.5, ["persistent cough", "chest congestion", "wheezing"]),
    ("Acid Reflux", "Gastroenterologist", 85.7, ["heartburn", "regurgitation", "chest pain"]),
    ("Anxiety Disorder", "Psychiatrist", 90.3, ["restlessness", "rapid heartbeat", "trouble sleeping"]),
    ("Type 2 Diabetes", "Endocrinologist", 96.1, ["frequent urination", "increased thirst", "fatigue"]),
    ("Influenza", "General Physician", 92.8, ["fever", "body aches", "chills", "fatigue"]),
    ("Sinusitis", "ENT Specialist", 88.9, ["facial pain", "nasal congestion", "headache"]),
    ("Allergic Rhinitis", "Allergist", 86.5, ["sneezing", "itchy eyes", "runny nose"]),
    ("Anemia", "Hematologist", 93.4, ["fatigue", "pale skin", "shortness of breath"]),
    ("Arthritis", "Rheumatologist", 90.7, ["joint pain", "stiffness", "swelling"]),
    ("UTI", "Urologist", 94.2, ["burning urination", "frequent urination", "lower abdominal pain"]),
    ("Gastritis", "Gastroenterologist", 87.8, ["stomach pain", "nausea", "bloating"]),
    ("Asthma", "Pulmonologist", 92.5, ["wheezing", "shortness of breath", "chest tightness"]),
    ("Depression", "Psychiatrist", 89.6, ["persistent sadness", "loss of interest", "fatigue"]),
    ("Hyperthyroidism", "Endocrinologist", 91.8, ["weight loss", "rapid heartbeat", "anxiety"]),
    ("Pneumonia", "Pulmonologist", 95.3, ["high fever", "chest pain", "productive cough"]),
    ("Conjunctivitis", "Ophthalmologist", 88.4, ["red eyes", "itching", "discharge"]),
]

NOTES_POOL = [
    "Patient stable. Continue current medication.",
    "Recommend follow-up in 2 weeks.",
    "Lab tests ordered. Awaiting results.",
    "Prescribed antibiotics for 7 days.",
    "Lifestyle changes discussed. Diet plan provided.",
    "Referred to specialist for further evaluation.",
    "Symptoms improving. Reduce dosage by half.",
    "Bed rest advised for 3-5 days.",
    "Vital signs normal. Continue monitoring.",
    "Patient educated on symptom management.",
]

REASONS = [
    "Routine checkup", "Follow-up consultation", "Symptom review",
    "Test results review", "Initial consultation", "Annual physical",
    "Vaccination", "Prescription renewal", "Chronic condition management",
    "Post-surgery follow-up",
]

SPECIALISTS = [
    "Cardiologist", "Neurologist", "Dermatologist", "Pediatrician",
    "General Physician", "Pulmonologist", "Endocrinologist", "Psychiatrist",
]


def seed(target_records=60, target_appts=40):
    db = SessionLocal()
    try:
        patients = db.query(User).filter(User.role == UserRole.PATIENT).all()
        doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()

        if not patients:
            print("No patients found. Run seed_db.py first.")
            return

        patient_ids = [p.id for p in patients]
        doctor_ids = [d.id for d in doctors]
        print(f"Found {len(patient_ids)} patients, {len(doctor_ids)} doctors")

        statuses = ["completed", "completed", "pending", "reviewed", "in_review"]

        # Medical records
        for i in range(target_records):
            diag, spec, base_score, symptoms = random.choice(DIAGNOSES)
            sample_size = random.randint(2, len(symptoms))
            db.add(MedicalRecord(
                id=str(uuid.uuid4()),
                patient_id=random.choice(patient_ids),
                doctor_id=random.choice(doctor_ids) if doctor_ids and random.random() > 0.25 else None,
                symptoms=random.sample(symptoms, sample_size),
                ai_prediction=diag,
                confidence_score=round(base_score + random.uniform(-4, 4), 2),
                recommended_specialist=spec,
                created_at=datetime.now(timezone.utc) - timedelta(
                    days=random.randint(0, 180),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                ),
                status=random.choice(statuses),
                doctor_notes=random.choice(NOTES_POOL) if random.random() > 0.3 else None
            ))

        # Appointments
        appt_statuses_past = ["completed", "completed", "cancelled", "no_show"]
        appt_statuses_future = ["upcoming", "upcoming", "confirmed"]
        for i in range(target_appts):
            days_offset = random.randint(-60, 90)
            date_obj = datetime.now() + timedelta(days=days_offset)
            if days_offset < 0:
                status = random.choice(appt_statuses_past)
            elif days_offset == 0:
                status = "today"
            else:
                status = random.choice(appt_statuses_future)
            db.add(Appointment(
                id=str(uuid.uuid4()),
                patient_id=random.choice(patient_ids),
                specialist=random.choice(SPECIALISTS),
                date=date_obj.strftime("%Y-%m-%d"),
                time=f"{random.randint(8, 18):02d}:{random.choice(['00', '15', '30', '45'])}",
                status=status,
                reason=random.choice(REASONS)
            ))

        db.commit()

        # Final counts
        total_records = db.query(MedicalRecord).count()
        total_appts = db.query(Appointment).count()
        print(f"\n+ Added {target_records} records, {target_appts} appointments")
        print(f"DB totals: {total_records} records, {total_appts} appointments")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
