"""
Phase 2 seed script - extends existing data with:
- Appointments (upcoming + past)
- Notifications (prescription, appointment, approval events)
- Messages (between doctor-patient pairs)
- Medication logs (recent adherence)

Run AFTER seed_prescription_data.py.
"""

from app.db.session import SessionLocal
from app.models.models import (
    User, UserRole, DoctorPatient, Prescription, MedicalRecord,
    Appointment, Notification, Message, MedicationLog
)
import uuid
from datetime import datetime, timedelta


def seed():
    db = SessionLocal()
    try:
        # 0. LOAD EXISTING DATA
        print("\n=== Loading existing doctors and patients ===")
        doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()
        patients = db.query(User).filter(User.role == UserRole.PATIENT).all()

        if not doctors or not patients:
            print("ERROR: Run seed_prescription_data.py first.")
            return

        print(f"  Found {len(doctors)} doctors, {len(patients)} patients")

        # Build assignment map: patient_id -> doctor_id
        assignments = db.query(DoctorPatient).filter(DoctorPatient.status == "active").all()
        patient_to_doctor = {a.patient_id: a.doctor_id for a in assignments}
        doctor_to_patients = {}
        for a in assignments:
            doctor_to_patients.setdefault(a.doctor_id, []).append(a.patient_id)

        # Specialty lookup
        from app.models.models import DoctorProfile
        doctor_specs = {}
        for doc in doctors:
            profile = db.query(DoctorProfile).filter(DoctorProfile.user_id == doc.id).first()
            if profile:
                doctor_specs[doc.id] = profile.specialization

        # 1. CREATE APPOINTMENTS
        print("\n=== Creating Appointments ===")
        appt_count = 0
        reasons = [
            "Follow-up consultation",
            "Routine checkup",
            "Medication review",
            "Test results discussion",
            "New symptom assessment",
        ]

        for patient in patients:
            doctor_id = patient_to_doctor.get(patient.id)
            if not doctor_id:
                continue
            specialty = doctor_specs.get(doctor_id, "General")

            # Skip if patient already has appointments
            existing = db.query(Appointment).filter(Appointment.patient_id == patient.id).count()
            if existing > 0:
                continue

            # 1 upcoming
            future_date = datetime.now() + timedelta(days=3 + (hash(patient.id) % 14))
            appt_upcoming = Appointment(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                specialist=specialty,
                date=future_date.strftime("%Y-%m-%d"),
                time=f"{9 + (hash(patient.id) % 8):02d}:00",
                reason=reasons[hash(patient.id) % len(reasons)],
                status="upcoming",
            )
            db.add(appt_upcoming)
            appt_count += 1

            # 1 past completed
            past_date = datetime.now() - timedelta(days=14 + (hash(patient.id) % 10))
            appt_past = Appointment(
                id=str(uuid.uuid4()),
                patient_id=patient.id,
                specialist=specialty,
                date=past_date.strftime("%Y-%m-%d"),
                time=f"{10 + (hash(patient.id + 'past') % 6):02d}:30",
                reason="Initial consultation",
                status="completed",
            )
            db.add(appt_past)
            appt_count += 1

        db.commit()
        print(f"  Created {appt_count} appointments")

        # 2. CREATE NOTIFICATIONS
        print("\n=== Creating Notifications ===")
        notif_count = 0

        # Patient notifications - prescription events
        prescriptions = db.query(Prescription).all()
        for rx in prescriptions[:20]:  # cap at 20 to avoid spam
            existing = db.query(Notification).filter(
                Notification.user_id == rx.patient_id,
                Notification.related_id == rx.id,
                Notification.type == "prescription",
            ).first()
            if existing:
                continue

            doctor = db.query(User).filter(User.id == rx.doctor_id).first()
            doc_name = doctor.email.split("@")[0] if doctor else "Your doctor"

            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=rx.patient_id,
                type="prescription",
                title="New Prescription",
                message=f"Dr. {doc_name} prescribed {rx.medication_name} ({rx.dosage})",
                is_read=(hash(rx.id) % 3 == 0),  # ~1/3 read
                related_id=rx.id,
                related_url="/dashboard/medications",
                created_at=datetime.now() - timedelta(days=hash(rx.id) % 14),
            )
            db.add(notif)
            notif_count += 1

        # Patient notifications - appointment confirmations
        appts = db.query(Appointment).filter(Appointment.status == "upcoming").all()
        for appt in appts:
            existing = db.query(Notification).filter(
                Notification.user_id == appt.patient_id,
                Notification.related_id == appt.id,
                Notification.type == "appointment",
            ).first()
            if existing:
                continue

            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=appt.patient_id,
                type="appointment",
                title="Appointment Reminder",
                message=f"Upcoming {appt.specialist} appointment on {appt.date} at {appt.time}",
                is_read=False,
                related_id=appt.id,
                related_url="/dashboard/appointments",
                created_at=datetime.now() - timedelta(days=1),
            )
            db.add(notif)
            notif_count += 1

        # Doctor notifications - pending approvals
        pending_records = db.query(MedicalRecord).filter(MedicalRecord.status == "pending").all()
        for rec in pending_records[:10]:
            if not rec.doctor_id:
                continue
            existing = db.query(Notification).filter(
                Notification.user_id == rec.doctor_id,
                Notification.related_id == rec.id,
                Notification.type == "approval",
            ).first()
            if existing:
                continue

            patient = db.query(User).filter(User.id == rec.patient_id).first()
            pat_name = patient.email.split("@")[0] if patient else "Patient"

            notif = Notification(
                id=str(uuid.uuid4()),
                user_id=rec.doctor_id,
                type="approval",
                title="Pending Approval",
                message=f"Review {pat_name}'s diagnosis: {rec.ai_prediction[:50]}",
                is_read=False,
                related_id=rec.id,
                related_url=f"/dashboard/records/{rec.id}",
                created_at=datetime.now() - timedelta(hours=hash(rec.id) % 48),
            )
            db.add(notif)
            notif_count += 1

        db.commit()
        print(f"  Created {notif_count} notifications")

        # 3. CREATE MESSAGES
        print("\n=== Creating Messages ===")
        msg_count = 0

        sample_conversations = [
            ("patient", "Hi doctor, I've been taking the medication regularly. Should I continue with the same dosage?"),
            ("doctor", "Yes, continue with the same dosage. How are you feeling overall?"),
            ("patient", "Much better, thank you! The symptoms have reduced significantly."),
            ("doctor", "Great to hear! Let me know if you notice any new side effects."),
            ("patient", "I had a slight headache yesterday but it went away. Should I be concerned?"),
            ("doctor", "Mild headaches can be a temporary side effect. Stay hydrated and let me know if it persists."),
        ]

        for doctor_id, patient_ids in doctor_to_patients.items():
            # Pick 2-3 patients per doctor for messaging
            selected = patient_ids[:3]
            for patient_id in selected:
                # Skip if conversation exists
                existing = db.query(Message).filter(
                    ((Message.sender_id == doctor_id) & (Message.receiver_id == patient_id)) |
                    ((Message.sender_id == patient_id) & (Message.receiver_id == doctor_id))
                ).count()
                if existing > 0:
                    continue

                # Create a conversation thread
                base_time = datetime.now() - timedelta(days=7)
                for i, (sender_role, content) in enumerate(sample_conversations):
                    sender_id = patient_id if sender_role == "patient" else doctor_id
                    receiver_id = doctor_id if sender_role == "patient" else patient_id

                    msg = Message(
                        id=str(uuid.uuid4()),
                        sender_id=sender_id,
                        receiver_id=receiver_id,
                        content=content,
                        is_read=(i < len(sample_conversations) - 2),  # last 2 unread
                        created_at=base_time + timedelta(hours=i * 6),
                    )
                    db.add(msg)
                    msg_count += 1

        db.commit()
        print(f"  Created {msg_count} messages")

        # 4. CREATE MEDICATION LOGS
        print("\n=== Creating Medication Logs ===")
        log_count = 0

        active_rxs = db.query(Prescription).filter(Prescription.status == "active").all()
        for rx in active_rxs:
            # Skip if logs exist
            existing = db.query(MedicationLog).filter(MedicationLog.prescription_id == rx.id).count()
            if existing > 0:
                continue

            # Create 5-10 logs over past 2 weeks
            num_logs = 5 + (hash(rx.id) % 6)
            for i in range(num_logs):
                days_ago = i * 2 + (hash(rx.id + str(i)) % 2)
                taken_time = datetime.now() - timedelta(days=days_ago, hours=hash(rx.id + str(i)) % 12)

                # 80% taken, 20% missed
                status = "taken" if (hash(rx.id + str(i)) % 5) != 0 else "missed"

                log = MedicationLog(
                    id=str(uuid.uuid4()),
                    prescription_id=rx.id,
                    patient_id=rx.patient_id,
                    taken_at=taken_time,
                    status=status,
                    notes=None,
                )
                db.add(log)
                log_count += 1

        db.commit()
        print(f"  Created {log_count} medication logs")

        # SUMMARY
        print("\n" + "=" * 50)
        print("Phase 2 seeding complete!")
        print("=" * 50)
        print(f"  Appointments: {appt_count}")
        print(f"  Notifications: {notif_count}")
        print(f"  Messages: {msg_count}")
        print(f"  Medication logs: {log_count}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
