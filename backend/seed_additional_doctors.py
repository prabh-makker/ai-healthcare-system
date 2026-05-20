"""Add doctors for missing specializations to achieve 100% disease coverage."""

import uuid
from datetime import datetime, timezone
from app.db.session import SessionLocal
from app.models.models import User, DoctorProfile
from app.core import security


def hash_pwd(p):
    return security.get_password_hash(p)


# Additional doctors for missing specializations
ADDITIONAL_DOCTORS = [
    {"email": "dr.verma@healthai.com", "name": "Dr. Suresh Verma", "spec": "Psychiatrist"},
    {"email": "dr.rao@healthai.com", "name": "Dr. Neha Rao", "spec": "Psychiatrist"},
    {"email": "dr.bhat@healthai.com", "name": "Dr. Rajesh Bhat", "spec": "Endocrinologist"},
    {"email": "dr.kulkarni@healthai.com", "name": "Dr. Meera Kulkarni", "spec": "Rheumatologist"},
    {"email": "dr.desai@healthai.com", "name": "Dr. Amit Desai", "spec": "ENT Specialist"},
    {"email": "dr.nair@healthai.com", "name": "Dr. Vivek Nair", "spec": "Hepatologist"},
    {"email": "dr.mishra@healthai.com", "name": "Dr. Anjum Mishra", "spec": "General Physician"},
    {"email": "dr.agarwal@healthai.com", "name": "Dr. Sandeep Agarwal", "spec": "Infectious Disease Specialist"},
]


def main():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    print("\n" + "="*70)
    print("ADDING DOCTORS FOR MISSING SPECIALIZATIONS")
    print("="*70)

    created_count = 0
    for doc_data in ADDITIONAL_DOCTORS:
        # Check if doctor already exists
        existing = db.query(User).filter(User.email == doc_data["email"]).first()
        if existing:
            print(f"  [SKIP] {doc_data['name']} ({doc_data['spec']}) - Already exists")
            continue

        # Parse name
        name_parts = doc_data["name"].replace("Dr. ", "").split(" ", 1)
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Create user
        user = User(
            id=str(uuid.uuid4()),
            email=doc_data["email"],
            hashed_password=hash_pwd("Doctor@1234"),
            role="DOCTOR",
            first_name=first_name,
            last_name=last_name,
            is_active=True,
            created_at=now,
        )
        db.add(user)
        db.flush()

        # Create doctor profile
        profile = DoctorProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            specialization=doc_data["spec"],
            availability_status=True,
        )
        db.add(profile)
        db.commit()

        print(f"  [OK] {first_name:20} - {doc_data['spec']:35} ({doc_data['email']})")
        created_count += 1

    print("\n" + "="*70)
    print(f"CREATED {created_count} NEW DOCTORS")
    print("="*70 + "\n")

    db.close()


if __name__ == "__main__":
    main()
