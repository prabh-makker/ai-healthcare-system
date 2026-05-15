"""
Comprehensive seeding script for doctor-patient-prescription workflow.
Creates:
- 4 Doctors with specialties
- 10 Patients with chronic conditions
- Smart doctor-patient assignments based on specialty
- 2-4 prescriptions per patient
- 2-3 medical records per patient (mix of pending/approved)
"""

from app.db.session import SessionLocal
from app.models.models import (
    User, UserRole, DoctorProfile, PatientProfile,
    DoctorPatient, Prescription, MedicalRecord
)
from app.core.security import get_password_hash
import uuid
from datetime import datetime, timedelta, date

def seed():
    db = SessionLocal()
    try:
        # 1. CREATE 4 DOCTORS WITH SPECIALTIES
        print("\n=== Creating Doctors ===")

        doctors = [
            {
                "email": "cardio@healthai.com",
                "name": "Dr. Sarah Chen",
                "specialization": "Cardiology",
                "password": "Doctor@123"
            },
            {
                "email": "neuro@healthai.com",
                "name": "Dr. Michael Rodriguez",
                "specialization": "Neurology",
                "password": "Doctor@123"
            },
            {
                "email": "derma@healthai.com",
                "name": "Dr. Priya Patel",
                "specialization": "Dermatology",
                "password": "Doctor@123"
            },
            {
                "email": "pedia@healthai.com",
                "name": "Dr. James Wilson",
                "specialization": "Pediatrics",
                "password": "Doctor@123"
            },
        ]

        doctor_ids = {}
        for doc_data in doctors:
            existing = db.query(User).filter(User.email == doc_data["email"]).first()
            if existing:
                print(f"  Skipping {doc_data['email']} (already exists)")
                doctor_ids[doc_data["specialization"]] = existing.id
                continue

            doc_id = str(uuid.uuid4())
            doctor = User(
                id=doc_id,
                email=doc_data["email"],
                hashed_password=get_password_hash(doc_data["password"]),
                role=UserRole.DOCTOR,
                is_active=True
            )
            db.add(doctor)
            db.flush()

            doc_profile = DoctorProfile(
                id=str(uuid.uuid4()),
                user_id=doc_id,
                specialization=doc_data["specialization"],
                availability_status=True
            )
            db.add(doc_profile)
            doctor_ids[doc_data["specialization"]] = doc_id
            print(f"  Created: {doc_data['email']} ({doc_data['specialization']})")

        # 2. CREATE 10 PATIENTS WITH CONDITIONS
        print("\n=== Creating Patients ===")

        patients_data = [
            # Cardiology patients (3)
            {
                "email": "alice@healthai.com",
                "name": "Alice Johnson",
                "conditions": ["hypertension", "high cholesterol"],
                "doctor_specialty": "Cardiology",
                "blood_group": "O+",
            },
            {
                "email": "bob@healthai.com",
                "name": "Bob Smith",
                "conditions": ["heart disease", "diabetes"],
                "doctor_specialty": "Cardiology",
                "blood_group": "A+",
            },
            {
                "email": "carol@healthai.com",
                "name": "Carol Davis",
                "conditions": ["hypertension", "obesity"],
                "doctor_specialty": "Cardiology",
                "blood_group": "B+",
            },
            # Neurology patients (3)
            {
                "email": "david@healthai.com",
                "name": "David Lee",
                "conditions": ["migraines", "anxiety"],
                "doctor_specialty": "Neurology",
                "blood_group": "AB+",
            },
            {
                "email": "emma@healthai.com",
                "name": "Emma Wilson",
                "conditions": ["epilepsy", "depression"],
                "doctor_specialty": "Neurology",
                "blood_group": "O-",
            },
            {
                "email": "frank@healthai.com",
                "name": "Frank Garcia",
                "conditions": ["Parkinson's disease", "sleep disorder"],
                "doctor_specialty": "Neurology",
                "blood_group": "A-",
            },
            # Dermatology patients (2)
            {
                "email": "grace@healthai.com",
                "name": "Grace Martinez",
                "conditions": ["psoriasis", "eczema"],
                "doctor_specialty": "Dermatology",
                "blood_group": "B-",
            },
            {
                "email": "henry@healthai.com",
                "name": "Henry Kim",
                "conditions": ["acne", "rosacea"],
                "doctor_specialty": "Dermatology",
                "blood_group": "AB-",
            },
            # Pediatrics patients (2)
            {
                "email": "isabella@healthai.com",
                "name": "Isabella Brown",
                "conditions": ["asthma", "allergies"],
                "doctor_specialty": "Pediatrics",
                "blood_group": "O+",
            },
            {
                "email": "jack@healthai.com",
                "name": "Jack Thompson",
                "conditions": ["ADHD", "autism spectrum disorder"],
                "doctor_specialty": "Pediatrics",
                "blood_group": "A+",
            },
        ]

        patient_ids = {}
        for pat_data in patients_data:
            existing = db.query(User).filter(User.email == pat_data["email"]).first()
            if existing:
                print(f"  Skipping {pat_data['email']} (already exists)")
                patient_ids[pat_data["email"]] = {
                    "id": existing.id,
                    "specialty": pat_data["doctor_specialty"],
                    "name": pat_data["name"],
                    "conditions": pat_data["conditions"]
                }
                continue

            pat_id = str(uuid.uuid4())
            patient = User(
                id=pat_id,
                email=pat_data["email"],
                hashed_password=get_password_hash("Patient@123"),
                role=UserRole.PATIENT,
                is_active=True
            )
            db.add(patient)
            db.flush()

            pat_profile = PatientProfile(
                id=str(uuid.uuid4()),
                user_id=pat_id,
                date_of_birth=datetime(1990, 1, 1),
                blood_group=pat_data["blood_group"],
                chronic_conditions=pat_data["conditions"],
                emergency_contact="555-0000"
            )
            db.add(pat_profile)
            patient_ids[pat_data["email"]] = {
                "id": pat_id,
                "specialty": pat_data["doctor_specialty"],
                "name": pat_data["name"],
                "conditions": pat_data["conditions"]
            }
            print(f"  Created: {pat_data['email']} ({', '.join(pat_data['conditions'])})")

        # 3. ASSIGN PATIENTS TO DOCTORS (matching specialty)
        print("\n=== Assigning Patients to Doctors ===")

        for pat_email, pat_info in patient_ids.items():
            doctor_id = doctor_ids.get(pat_info["specialty"])
            if not doctor_id:
                print(f"  WARNING: No doctor found for {pat_info['specialty']}")
                continue

            # Check if already assigned
            existing_assignment = (
                db.query(DoctorPatient)
                .filter(
                    DoctorPatient.doctor_id == doctor_id,
                    DoctorPatient.patient_id == pat_info["id"],
                    DoctorPatient.status == "active"
                )
                .first()
            )

            if existing_assignment:
                print(f"  Skipping {pat_info['name']} (already assigned)")
                continue

            assignment = DoctorPatient(
                id=str(uuid.uuid4()),
                doctor_id=doctor_id,
                patient_id=pat_info["id"],
                status="active"
            )
            db.add(assignment)
            print(f"  Assigned: {pat_info['name']} → {pat_info['specialty']}")

        db.commit()

        # 4. CREATE PRESCRIPTIONS (2-4 per patient)
        print("\n=== Creating Prescriptions ===")

        prescriptions_by_specialty = {
            "Cardiology": [
                {"name": "Lisinopril", "dosage": "10mg", "frequency": "Once daily", "instructions": "Take in the morning with or without food"},
                {"name": "Atorvastatin", "dosage": "20mg", "frequency": "Once daily", "instructions": "Take at bedtime"},
                {"name": "Aspirin", "dosage": "81mg", "frequency": "Once daily", "instructions": "Take with water in the morning"},
                {"name": "Metoprolol", "dosage": "50mg", "frequency": "Twice daily", "instructions": "Take with meals"},
            ],
            "Neurology": [
                {"name": "Levetiracetam", "dosage": "500mg", "frequency": "Twice daily", "instructions": "Take with meals"},
                {"name": "Sertraline", "dosage": "50mg", "frequency": "Once daily", "instructions": "Take in the morning"},
                {"name": "Amitriptyline", "dosage": "25mg", "frequency": "Once daily at bedtime", "instructions": "Take at bedtime"},
                {"name": "Fluoxetine", "dosage": "20mg", "frequency": "Once daily", "instructions": "Take in the morning"},
            ],
            "Dermatology": [
                {"name": "Hydrocortisone Cream", "dosage": "1%", "frequency": "Twice daily", "instructions": "Apply to affected area"},
                {"name": "Tretinoin", "dosage": "0.025%", "frequency": "Once daily at bedtime", "instructions": "Apply to clean skin only"},
                {"name": "Clotrimazole Cream", "dosage": "1%", "frequency": "Twice daily", "instructions": "Apply to affected area"},
                {"name": "Salicylic Acid", "dosage": "2%", "frequency": "Once or twice daily", "instructions": "Use on affected area only"},
            ],
            "Pediatrics": [
                {"name": "Albuterol Inhaler", "dosage": "100mcg", "frequency": "As needed", "instructions": "Use 2 puffs when needed for breathing"},
                {"name": "Methylphenidate", "dosage": "10mg", "frequency": "Once daily in morning", "instructions": "Take with breakfast"},
                {"name": "Amoxicillin", "dosage": "250mg", "frequency": "Three times daily", "instructions": "Complete full course"},
                {"name": "Cetirizine", "dosage": "5mg", "frequency": "Once daily", "instructions": "Take in the morning"},
            ],
        }

        prescription_count = 0
        for pat_email, pat_info in patient_ids.items():
            doctor_id = doctor_ids.get(pat_info["specialty"])
            specialty = pat_info["specialty"]
            patient_id = pat_info["id"]

            # Get 2-4 random prescriptions for this specialty
            spec_meds = prescriptions_by_specialty.get(specialty, [])
            num_prescriptions = 2 + (hash(patient_id) % 3)  # 2-4 prescriptions

            for i in range(min(num_prescriptions, len(spec_meds))):
                med = spec_meds[i]

                # Check if prescription already exists
                existing = (
                    db.query(Prescription)
                    .filter(
                        Prescription.patient_id == patient_id,
                        Prescription.doctor_id == doctor_id,
                        Prescription.medication_name == med["name"]
                    )
                    .first()
                )

                if existing:
                    continue

                prescription = Prescription(
                    id=str(uuid.uuid4()),
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    medication_name=med["name"],
                    dosage=med["dosage"],
                    frequency=med["frequency"],
                    instructions=med["instructions"],
                    start_date=datetime.now() - timedelta(days=30),
                    status="active"
                )
                db.add(prescription)
                prescription_count += 1

        db.commit()
        print(f"  Created {prescription_count} prescriptions")

        # 5. CREATE MEDICAL RECORDS (2-3 per patient, mix of statuses)
        print("\n=== Creating Medical Records ===")

        sample_symptoms = {
            "hypertension": ["high blood pressure", "headaches", "dizziness"],
            "heart disease": ["chest pain", "shortness of breath", "fatigue"],
            "migraines": ["severe headache", "light sensitivity", "nausea"],
            "asthma": ["shortness of breath", "wheezing", "chest tightness"],
        }

        sample_diagnoses = {
            "Cardiology": "Hypertensive Heart Disease - Stable",
            "Neurology": "Migraine Disorder with Aura",
            "Dermatology": "Psoriasis - Chronic Plaque Type",
            "Pediatrics": "Asthma - Intermittent",
        }

        record_count = 0
        for pat_email, pat_info in patient_ids.items():
            doctor_id = doctor_ids.get(pat_info["specialty"])
            patient_id = pat_info["id"]
            specialty = pat_info["specialty"]

            # Create 2-3 records per patient
            num_records = 2 + (hash(patient_id) % 2)  # 2-3 records

            for i in range(num_records):
                # Mix of pending and approved
                is_approved = (hash(patient_id + str(i)) % 2) == 0

                record = MedicalRecord(
                    id=str(uuid.uuid4()),
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    symptoms=pat_info["conditions"][:2],
                    ai_prediction=sample_diagnoses.get(specialty, "Diagnosis pending"),
                    confidence_score=0.85 + (hash(patient_id) % 15) / 100,
                    recommended_specialist=specialty,
                    status="approved" if is_approved else "pending",
                    doctor_notes="Patient reviewed and diagnosis confirmed." if is_approved else None,
                    created_at=datetime.now() - timedelta(days=30-i*10)
                )
                db.add(record)
                record_count += 1

        db.commit()
        print(f"  Created {record_count} medical records")

        print("\n" + "="*50)
        print("✓ Seeding completed successfully!")
        print("="*50)
        print(f"\n Summary:")
        print(f"  • 4 Doctors created with specialties")
        print(f"  • 10 Patients created with chronic conditions")
        print(f"  • Doctor-Patient assignments created based on specialty matching")
        print(f"  • {prescription_count} Prescriptions created (2-4 per patient)")
        print(f"  • {record_count} Medical records created (2-3 per patient)")
        print(f"\n Test Credentials:")
        print(f"  Doctors: [specialty]@healthai.com / Doctor@123")
        print(f"    - cardio@healthai.com (Cardiology)")
        print(f"    - neuro@healthai.com (Neurology)")
        print(f"    - derma@healthai.com (Dermatology)")
        print(f"    - pedia@healthai.com (Pediatrics)")
        print(f"  Patients: [firstname]@healthai.com / Patient@123")
        print(f"    - alice@healthai.com through jack@healthai.com")

    except Exception as e:
        db.rollback()
        print(f"Error seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
