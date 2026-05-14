"""Authorization utilities for resource ownership and access control."""

from typing import Optional
from uuid import UUID
from app.models.models import User, UserRole, MedicalRecord


def check_record_ownership(record: MedicalRecord, current_user: User) -> bool:
    """
    Check if user can access a medical record.

    Allows access if:
    - User is the patient owner
    - User is the assigned doctor
    - User is an admin

    Args:
        record: MedicalRecord instance
        current_user: Current authenticated user

    Returns:
        True if user can access the record, False otherwise
    """
    if current_user.role == UserRole.ADMIN:
        return True

    is_patient_owner = str(record.patient_id) == str(current_user.id)
    is_assigned_doctor = record.doctor_id and str(record.doctor_id) == str(current_user.id)

    return is_patient_owner or is_assigned_doctor


def check_record_modification(record: MedicalRecord, current_user: User) -> tuple[bool, str]:
    """
    Check if user can modify a medical record.

    Allows modification if:
    - User is the patient owner
    - User is the assigned doctor (doctor notes/status only)
    - User is an admin

    Args:
        record: MedicalRecord instance
        current_user: Current authenticated user

    Returns:
        Tuple of (is_allowed: bool, error_message: str)
    """
    if current_user.role == UserRole.ADMIN:
        return True, ""

    is_patient_owner = str(record.patient_id) == str(current_user.id)
    is_assigned_doctor = record.doctor_id and str(record.doctor_id) == str(current_user.id)

    if current_user.role == UserRole.PATIENT:
        if not is_patient_owner:
            return False, "Forbidden"
    elif current_user.role == UserRole.DOCTOR:
        if not is_assigned_doctor:
            return False, "You are not assigned to this record"
    else:
        return False, "Forbidden"

    return True, ""


def check_record_deletion(record: MedicalRecord, current_user: User) -> tuple[bool, str]:
    """
    Check if user can delete a medical record.

    Same rules as check_record_modification.

    Args:
        record: MedicalRecord instance
        current_user: Current authenticated user

    Returns:
        Tuple of (is_allowed: bool, error_message: str)
    """
    return check_record_modification(record, current_user)
