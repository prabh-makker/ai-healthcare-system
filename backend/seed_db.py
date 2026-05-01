from app.db.session import SessionLocal
from app.models.models import User, UserRole, DoctorProfile, PatientProfile
from app.core.security import get_password_hash
import uuid
from datetime import datetime

def seed():
    db = SessionLocal()
    try:
        # 1. Create Admin
        admin_email = "admin@healthai.com"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                id=uuid.uuid4(),
                email=admin_email,
                hashed_password=get_password_hash("Admin@123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print(f"Created: {admin_email}")

        # 2. Create Doctor
        doc_email = "doctor@healthai.com"
        doctor = db.query(User).filter(User.email == doc_email).first()
        if not doctor:
            doc_id = uuid.uuid4()
            doctor = User(
                id=doc_id,
                email=doc_email,
                hashed_password=get_password_hash("Doctor@123"),
                role=UserRole.DOCTOR,
                is_active=True
            )
            db.add(doctor)
            db.flush()
            
            doc_profile = DoctorProfile(
                id=uuid.uuid4(),
                user_id=doc_id,
                specialization="General Physician",
                availability_status=True
            )
            db.add(doc_profile)
            print(f"Created: {doc_email}")

        # 3. Create Patient
        pat_email = "patient@healthai.com"
        patient = db.query(User).filter(User.email == pat_email).first()
        if not patient:
            pat_id = uuid.uuid4()
            patient = User(
                id=pat_id,
                email=pat_email,
                hashed_password=get_password_hash("Patient@123"),
                role=UserRole.PATIENT,
                is_active=True
            )
            db.add(patient)
            db.flush()
            
            pat_profile = PatientProfile(
                id=uuid.uuid4(),
                user_id=pat_id,
                date_of_birth=datetime(1990, 1, 1),
                blood_group="O+",
                chronic_conditions=[],
                emergency_contact="9876543210"
            )
            db.add(pat_profile)
            print(f"Created: {pat_email}")

        db.commit()
        print("Seeding complete!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
