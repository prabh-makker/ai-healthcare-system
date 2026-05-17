"""Full clean seed: 12 patients + 6 doctors + varied data per user.

Wipes old patient/doctor accounts (keeps admins) and creates fresh dataset.

Usage: python seed_users.py
"""
import sys
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.models import (
    User, Prescription, Notification, DoctorPatient, Appointment,
    MedicalRecord, DoctorProfile, PatientProfile
)
from app.core import security


def hash_pwd(p): return security.get_password_hash(p)

DOCTORS = [
    {"email": "dr.sharma@healthai.com",   "name": "Anjali Sharma",  "spec": "Cardiologist"},
    {"email": "dr.khan@healthai.com",     "name": "Imran Khan",     "spec": "Neurologist"},
    {"email": "dr.mehta@healthai.com",    "name": "Priya Mehta",    "spec": "Dermatologist"},
    {"email": "dr.singh@healthai.com",    "name": "Rajiv Singh",    "spec": "Pediatrician"},
    {"email": "dr.iyer@healthai.com",     "name": "Lakshmi Iyer",   "spec": "Pulmonologist"},
    {"email": "dr.gupta@healthai.com",    "name": "Vikram Gupta",   "spec": "Gastroenterologist"},
]

PATIENTS = [
    {"email": "aarav.kumar@example.com",   "name": "Aarav Kumar"},
    {"email": "diya.patel@example.com",    "name": "Diya Patel"},
    {"email": "kabir.shah@example.com",    "name": "Kabir Shah"},
    {"email": "anaya.reddy@example.com",   "name": "Anaya Reddy"},
    {"email": "vihaan.joshi@example.com",  "name": "Vihaan Joshi"},
    {"email": "myra.nair@example.com",     "name": "Myra Nair"},
    {"email": "arjun.menon@example.com",   "name": "Arjun Menon"},
    {"email": "saanvi.rao@example.com",    "name": "Saanvi Rao"},
    {"email": "ishaan.verma@example.com",  "name": "Ishaan Verma"},
    {"email": "kiara.bose@example.com",    "name": "Kiara Bose"},
    {"email": "rohan.das@example.com",     "name": "Rohan Das"},
    {"email": "navya.jain@example.com",    "name": "Navya Jain"},
]

# Per-patient varied data templates (12 different profiles)
PATIENT_DATA = [
    # 0: Aarav - hypertension patient
    {"symptoms": ["headache", "chest_pain"], "disease": "Anxiety Disorder", "specialist": "Psychiatrist",
     "rx": [("Atenolol", "50mg", "Once daily"), ("Aspirin", "75mg", "Once daily")],
     "appt": [("Cardiology", 7, "10:00 AM", "upcoming", "BP follow-up")]},
    # 1: Diya - asthma patient
    {"symptoms": ["cough", "shortness_of_breath"], "disease": "Asthma", "specialist": "Pulmonologist",
     "rx": [("Salbutamol Inhaler", "100mcg", "As needed"), ("Montelukast", "10mg", "Once daily at night")],
     "appt": [("Pulmonologist", 5, "11:00 AM", "upcoming", "Asthma review"), ("Pulmonologist", -20, "10:00 AM", "completed", "Initial consult")]},
    # 2: Kabir - migraine
    {"symptoms": ["headache", "nausea"], "disease": "Migraine", "specialist": "Neurologist",
     "rx": [("Sumatriptan", "50mg", "As needed for migraine"), ("Propranolol", "40mg", "Twice daily")],
     "appt": [("Neurologist", 14, "03:00 PM", "upcoming", "Migraine management")]},
    # 3: Anaya - skin condition
    {"symptoms": ["body_ache"], "disease": "Common Cold", "specialist": "General Physician",
     "rx": [("Hydrocortisone Cream", "1%", "Apply twice daily"), ("Cetirizine", "10mg", "Once daily")],
     "appt": [("Dermatologist", 3, "02:00 PM", "upcoming", "Eczema follow-up")]},
    # 4: Vihaan - flu recovery
    {"symptoms": ["fever", "cough", "body_ache"], "disease": "Flu", "specialist": "General Physician",
     "rx": [("Paracetamol", "500mg", "Twice daily after meals"), ("Cough Syrup", "10ml", "Three times daily")],
     "appt": [("General Physician", -2, "09:00 AM", "completed", "Flu treatment")]},
    # 5: Myra - gastritis
    {"symptoms": ["stomach_pain", "nausea"], "disease": "Gastritis", "specialist": "Gastroenterologist",
     "rx": [("Omeprazole", "20mg", "Once daily before breakfast"), ("Domperidone", "10mg", "Three times daily")],
     "appt": [("Gastroenterologist", 10, "11:30 AM", "upcoming", "Endoscopy review")]},
    # 6: Arjun - bronchitis
    {"symptoms": ["cough", "fever"], "disease": "Bronchitis", "specialist": "Pulmonologist",
     "rx": [("Azithromycin", "500mg", "Once daily for 5 days"), ("Bromhexine", "8mg", "Three times daily")],
     "appt": [("Pulmonologist", 6, "04:00 PM", "upcoming", "Antibiotic review")]},
    # 7: Saanvi - pediatric (anxiety)
    {"symptoms": ["dizziness", "fatigue"], "disease": "Anxiety Disorder", "specialist": "Psychiatrist",
     "rx": [("Sertraline", "25mg", "Once daily in morning")],
     "appt": [("Psychiatrist", 21, "02:00 PM", "upcoming", "Therapy session")]},
    # 8: Ishaan - covid recovery
    {"symptoms": ["fever", "cough", "fatigue"], "disease": "COVID-19", "specialist": "Infectious Disease Specialist",
     "rx": [("Paracetamol", "650mg", "Three times daily"), ("Vitamin C", "1000mg", "Once daily"), ("Zinc", "50mg", "Once daily")],
     "appt": [("General Physician", -15, "10:00 AM", "completed", "COVID consult")]},
    # 9: Kiara - pneumonia
    {"symptoms": ["fever", "chest_pain", "shortness_of_breath"], "disease": "Pneumonia", "specialist": "Pulmonologist",
     "rx": [("Amoxicillin", "500mg", "Three times daily for 7 days"), ("Paracetamol", "500mg", "As needed for fever")],
     "appt": [("Pulmonologist", 4, "09:30 AM", "upcoming", "X-ray follow-up"), ("Pulmonologist", -8, "10:00 AM", "completed", "Initial diagnosis")]},
    # 10: Rohan - common cold
    {"symptoms": ["runny_nose", "sore_throat", "cough"], "disease": "Common Cold", "specialist": "General Physician",
     "rx": [("Cetirizine", "10mg", "Once daily at night"), ("Throat Lozenges", "1 tablet", "Every 4 hours")],
     "appt": []},
    # 11: Navya - healthy checkup (mild seasonal allergy noted)
    {"symptoms": ["runny_nose"], "disease": "Common Cold", "specialist": "General Physician",
     "rx": [("Multivitamin", "1 tablet", "Once daily after breakfast")],
     "appt": [("General Physician", 30, "11:00 AM", "upcoming", "Annual checkup")]},
]

# Notifications template (random selection per patient)
NOTIF_TEMPLATES = [
    {"type": "prescription", "title": "New Prescription",     "msg": "Your doctor has prescribed new medication. Check your medications page.", "url": "/dashboard/medications"},
    {"type": "appointment",  "title": "Appointment Reminder", "msg": "You have an upcoming appointment. Tap to view details.",                    "url": "/dashboard/appointments"},
    {"type": "record",       "title": "Record Approved",      "msg": "Your medical record has been reviewed and approved.",                       "url": "/dashboard/records"},
    {"type": "medication",   "title": "Medication Reminder",  "msg": "Time for your scheduled medication. Don't miss a dose!",                    "url": "/dashboard/medications"},
    {"type": "system",       "title": "Welcome",              "msg": "Welcome to HealthAI! Start by checking your symptoms in AI Diagnostics.",   "url": "/dashboard/symptoms"},
]


def main():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    # 1. Delete old non-admin users (cascade everything)
    print("=== Cleaning old patient/doctor accounts ===")
    old_users = db.query(User).filter(User.role != "ADMIN").all()
    old_ids = [u.id for u in old_users]
    if old_ids:
        # Build placeholder string for raw SQL
        placeholders = ",".join([f":id{i}" for i in range(len(old_ids))])
        params = {f"id{i}": uid for i, uid in enumerate(old_ids)}

        # Delete all dependent rows in correct FK order (use raw SQL to catch all tables)
        cleanup_queries = [
            f"DELETE FROM medication_log WHERE patient_id IN ({placeholders})",
            f"DELETE FROM medication_log WHERE prescription_id IN (SELECT id FROM prescription WHERE patient_id IN ({placeholders}) OR doctor_id IN ({placeholders}))",
            f"DELETE FROM prescription WHERE patient_id IN ({placeholders}) OR doctor_id IN ({placeholders})",
            f"DELETE FROM medical_record WHERE patient_id IN ({placeholders}) OR doctor_id IN ({placeholders})",
            f"DELETE FROM appointment WHERE patient_id IN ({placeholders})",
            f"DELETE FROM notification WHERE user_id IN ({placeholders})",
            f"DELETE FROM message WHERE sender_id IN ({placeholders}) OR receiver_id IN ({placeholders})",
            f"DELETE FROM audit_log WHERE user_id IN ({placeholders})",
            f"DELETE FROM doctor_patient WHERE doctor_id IN ({placeholders}) OR patient_id IN ({placeholders})",
            f"DELETE FROM doctor_profile WHERE user_id IN ({placeholders})",
            f"DELETE FROM patient_profile WHERE user_id IN ({placeholders})",
            f'DELETE FROM "user" WHERE id IN ({placeholders})',
        ]
        for q in cleanup_queries:
            # Need to repeat params for each placeholder set
            n_sets = q.count("(:id0")
            full_params = {}
            for s in range(max(n_sets, 1)):
                full_params.update(params)
            try:
                db.execute(text(q), params)
            except Exception as e:
                # Some tables might not have rows or specific columns - skip silently
                if "does not exist" in str(e).lower() or "no such" in str(e).lower():
                    db.rollback()
                    continue
                raise
        db.commit()
        print(f"  Deleted {len(old_users)} old users + their data")

    # 2. Create 6 doctors
    print("\n=== Creating 6 doctors ===")
    doctor_objs = []
    for d in DOCTORS:
        user = User(
            id=str(uuid.uuid4()),
            email=d["email"],
            hashed_password=hash_pwd("Doctor@1234"),
            role="DOCTOR",
            is_active=True,
            created_at=now,
        )
        db.add(user)
        db.flush()
        profile = DoctorProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            specialization=d["spec"],
            availability_status=True,
        )
        db.add(profile)
        doctor_objs.append({"user": user, "name": d["name"], "spec": d["spec"]})
        print(f"  [OK] Dr. {d['name']:25} ({d['spec']:25}) - {d['email']}")
    db.commit()

    # 3. Create 12 patients
    print("\n=== Creating 12 patients ===")
    patient_objs = []
    for p in PATIENTS:
        user = User(
            id=str(uuid.uuid4()),
            email=p["email"],
            hashed_password=hash_pwd("Patient@1234"),
            role="PATIENT",
            is_active=True,
            created_at=now,
        )
        db.add(user)
        db.flush()
        profile = PatientProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
        )
        db.add(profile)
        patient_objs.append({"user": user, "name": p["name"]})
        print(f"  [OK] {p['name']:20} - {p['email']}")
    db.commit()

    # 4. Assign patients to doctors (2 patients per doctor)
    print("\n=== Assigning patients to doctors ===")
    for i, patient in enumerate(patient_objs):
        doctor = doctor_objs[i % len(doctor_objs)]
        db.add(DoctorPatient(
            id=str(uuid.uuid4()),
            doctor_id=doctor["user"].id,
            patient_id=patient["user"].id,
            status="active",
        ))
        print(f"  {patient['name']:20} -> Dr. {doctor['name']}")
    db.commit()

    # 5. Seed data per patient
    print("\n=== Seeding patient data ===")
    for i, patient in enumerate(patient_objs):
        data = PATIENT_DATA[i]
        doctor = doctor_objs[i % len(doctor_objs)]
        pid, did = patient["user"].id, doctor["user"].id

        # Medical record (if has symptoms+disease)
        if data["symptoms"] and data["disease"]:
            db.add(MedicalRecord(
                id=str(uuid.uuid4()),
                patient_id=pid,
                doctor_id=did,
                symptoms=data["symptoms"],
                ai_prediction=data["disease"],
                confidence_score=70.0 + (i * 2 % 25),
                recommended_specialist=data["specialist"],
                status="approved" if i % 3 == 0 else "pending",
                doctor_notes=f"Patient {patient['name']} - reviewed by Dr. {doctor['name']}" if i % 3 == 0 else None,
                created_at=now - timedelta(days=i + 1),
            ))

        # Prescriptions
        for j, (med, dose, freq) in enumerate(data["rx"]):
            db.add(Prescription(
                id=str(uuid.uuid4()),
                patient_id=pid,
                doctor_id=did,
                medication_name=med,
                dosage=dose,
                frequency=freq,
                instructions=f"Prescribed by Dr. {doctor['name']}. Take as directed.",
                start_date=now - timedelta(days=j * 5),
                end_date=now + timedelta(days=10 + j * 7),
                status="active" if j == 0 else ("completed" if j > 1 else "active"),
            ))

        # Appointments
        for spec, day_offset, time_str, status, reason in data["appt"]:
            appt_date = now + timedelta(days=day_offset)
            db.add(Appointment(
                id=str(uuid.uuid4()),
                patient_id=pid,
                specialist=spec,
                date=appt_date.strftime("%Y-%m-%d"),
                time=time_str,
                status=status,
                reason=reason,
                created_at=now - timedelta(days=2),
            ))

        # Notifications (3 per patient - rotate templates)
        for k in range(3):
            template = NOTIF_TEMPLATES[(i + k) % len(NOTIF_TEMPLATES)]
            db.add(Notification(
                id=str(uuid.uuid4()),
                user_id=pid,
                type=template["type"],
                title=template["title"],
                message=template["msg"],
                related_url=template["url"],
                is_read=(k > 0),  # First one unread
                created_at=now - timedelta(hours=k * 4),
            ))

        print(f"  {patient['name']:20}: rx={len(data['rx'])} appt={len(data['appt'])} notif=3 record={'1' if data['disease'] else '0'}")

    db.commit()

    # 6. Seed doctor notifications
    print("\n=== Seeding doctor notifications ===")
    doctor_notif_templates = [
        ("appointment", "New Appointment Request", "A patient has booked an appointment with you for next week.", "/dashboard/appointments"),
        ("record", "Pending Records to Review", "You have {n} medical records awaiting your review.", "/dashboard/approvals"),
        ("message", "Patient Message", "A patient sent you a message regarding their treatment.", "/dashboard/messages"),
        ("system", "Weekly Summary", "Your weekly patient summary is now available.", "/dashboard/analytics"),
        ("prescription", "Prescription Renewed", "An active prescription is approaching its end date.", "/dashboard/prescriptions"),
    ]
    for doctor in doctor_objs:
        assigned = db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == doctor["user"].id,
            DoctorPatient.status == "active"
        ).count()
        for k, (ntype, title, msg, url) in enumerate(doctor_notif_templates):
            db.add(Notification(
                id=str(uuid.uuid4()),
                user_id=doctor["user"].id,
                type=ntype,
                title=title,
                message=msg.replace("{n}", str(assigned)),
                related_url=url,
                is_read=(k > 1),  # First 2 unread
                created_at=now - timedelta(hours=k * 3),
            ))
        print(f"  Dr. {doctor['name']:20} : {len(doctor_notif_templates)} notifications")
    db.commit()

    # 7. Clean admin notifications + audit log (admin sees only real-time data, no mock)
    print("\n=== Cleaning admin mock data (admin uses real-time data only) ===")
    from app.models.models import AuditLog
    admins = db.query(User).filter(User.role == "ADMIN").all()
    admin_ids = [a.id for a in admins]
    if admin_ids:
        # Wipe any pre-seeded admin notifications / audit log entries
        notif_deleted = db.query(Notification).filter(Notification.user_id.in_(admin_ids)).delete(synchronize_session=False)
        audit_deleted = db.query(AuditLog).filter(AuditLog.user_id.in_(admin_ids)).delete(synchronize_session=False)
        db.commit()
        print(f"  Removed {notif_deleted} admin notifications, {audit_deleted} mock audit entries")
        print(f"  Admin will see only real records/users/audit from actual system activity")

    print("\n=== DONE ===")
    print(f"Created: {len(DOCTORS)} doctors + {len(PATIENTS)} patients")
    print(f"\nLOGIN CREDENTIALS:")
    print(f"  Doctors  -> password: Doctor@1234")
    print(f"  Patients -> password: Patient@1234")
    print(f"  Admin    -> admin@healthai.com / Admin@1234")
    db.close()


if __name__ == "__main__":
    main()
