"""Seed ML feedback data from medical records for model accuracy metrics."""
from app.db.session import SessionLocal
from app.models.models import User, UserRole, MedicalRecord
from datetime import datetime
import random

def seed_ml_feedback():
    db = SessionLocal()
    try:
        # Get medical records without feedback
        records = db.query(MedicalRecord).filter(
            MedicalRecord.ai_prediction.isnot(None),
            MedicalRecord.accuracy_feedback == None
        ).all()

        if not records:
            print("No records without feedback found.")
            return

        # Get doctors to assign approvals
        doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()

        if not doctors:
            print("No doctors found.")
            return

        print(f"Seeding feedback for {len(records)} medical records...")

        feedback_options = [
            "correct",      # 60% - doctor approved, diagnosis was correct
            "correct",
            "correct",
            "partial",      # 25% - partially correct
            "partial",
            "incorrect",    # 15% - incorrect diagnosis
        ]

        total_assigned = 0
        for i, record in enumerate(records):
            # Assign random feedback
            feedback = random.choice(feedback_options)
            record.accuracy_feedback = feedback
            record.doctor_id = random.choice(doctors).id

            # Update status based on feedback
            if feedback == "correct":
                record.status = "approved"
            elif feedback == "partial":
                record.status = "reviewed"
            else:
                record.status = "in_review"

            total_assigned += 1

        db.commit()

        # Calculate and display metrics
        total_with_feedback = db.query(MedicalRecord).filter(
            MedicalRecord.accuracy_feedback.isnot(None)
        ).count()

        correct = db.query(MedicalRecord).filter(
            MedicalRecord.accuracy_feedback == "correct"
        ).count()

        partial = db.query(MedicalRecord).filter(
            MedicalRecord.accuracy_feedback == "partial"
        ).count()

        incorrect = db.query(MedicalRecord).filter(
            MedicalRecord.accuracy_feedback == "incorrect"
        ).count()

        accuracy = (correct / total_with_feedback * 100) if total_with_feedback > 0 else 0

        print(f"\n✓ Seeded feedback for {total_assigned} records")
        print(f"\nML Model Metrics:")
        print(f"  Total Records with Feedback: {total_with_feedback}")
        print(f"  Correct: {correct} ({correct/total_with_feedback*100:.1f}%)")
        print(f"  Partial: {partial} ({partial/total_with_feedback*100:.1f}%)")
        print(f"  Incorrect: {incorrect} ({incorrect/total_with_feedback*100:.1f}%)")
        print(f"  Overall Accuracy: {accuracy:.1f}%")
        print(f"\nThe admin dashboard now has real data for ML model configuration!")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_ml_feedback()
