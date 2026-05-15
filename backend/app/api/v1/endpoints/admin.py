import uuid
import io
import csv
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, desc, text, case
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db, engine
from app.models.models import (
    User, MedicalRecord, Appointment, Prescription, DoctorPatient,
    AuditLog, UserRole, MedicationLog, Notification, Message
)
from app.core.security import require_role

router = APIRouter()


# ============================================================
# AUDIT LOG HELPER
# ============================================================
def log_action(
    db: Session,
    user: Optional[User],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[str] = None,
    request: Optional[Request] = None,
):
    """Create audit log entry. Safe to call from any endpoint."""
    try:
        ip = request.client.host if request and request.client else None
        log = AuditLog(
            id=str(uuid.uuid4()),
            user_id=str(user.id) if user else None,
            user_email=user.email if user else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()


# ============================================================
# USER MANAGEMENT
# ============================================================
class UserStatusUpdate(BaseModel):
    is_active: bool


class UserRoleUpdate(BaseModel):
    role: UserRole


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    body: UserStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = body.is_active
    db.commit()
    log_action(db, current_user, "update", "user", user_id,
               f"Set active={body.is_active}", request)
    return {"id": user_id, "is_active": user.is_active}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    body: UserRoleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_role = user.role
    user.role = body.role
    db.commit()
    log_action(db, current_user, "update", "user", user_id,
               f"Role {old_role} -> {body.role}", request)
    return {"id": user_id, "role": body.role}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user.is_active = False  # soft delete
    db.commit()
    log_action(db, current_user, "delete", "user", user_id,
               f"Soft delete {user.email}", request)


# ============================================================
# AUDIT LOG VIEWER
# ============================================================
@router.get("/audit-log")
def get_audit_log(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    logs = q.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()
    return [{
        "id": str(log.id),
        "user_id": str(log.user_id) if log.user_id else None,
        "user_email": log.user_email,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "details": log.details,
        "ip_address": log.ip_address,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    } for log in logs]


# ============================================================
# DOCTOR PERFORMANCE METRICS
# ============================================================
@router.get("/doctor-performance")
def doctor_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Per-doctor metrics: avg approval time, total approved, pending count."""
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()

    # Group-by aggregations: one query per metric instead of N per doctor
    approved_q = dict(db.query(MedicalRecord.doctor_id, func.count(MedicalRecord.id)).filter(
        MedicalRecord.status.in_(["approved", "reviewed"])
    ).group_by(MedicalRecord.doctor_id).all())

    pending_q = dict(db.query(MedicalRecord.doctor_id, func.count(MedicalRecord.id)).filter(
        MedicalRecord.status == "pending"
    ).group_by(MedicalRecord.doctor_id).all())

    rx_q = dict(db.query(Prescription.doctor_id, func.count(Prescription.id)).group_by(Prescription.doctor_id).all())

    conf_q = dict(db.query(MedicalRecord.doctor_id, func.avg(MedicalRecord.confidence_score)).filter(
        MedicalRecord.status == "approved"
    ).group_by(MedicalRecord.doctor_id).all())

    result = [{
        "doctor_id": str(doc.id),
        "email": doc.email,
        "approved_count": approved_q.get(doc.id, 0),
        "pending_count": pending_q.get(doc.id, 0),
        "prescription_count": rx_q.get(doc.id, 0),
        "avg_confidence": round(float(conf_q.get(doc.id, 0) or 0), 2),
        "last_login": doc.last_login.isoformat() if doc.last_login else None,
    } for doc in doctors]
    return sorted(result, key=lambda x: x["approved_count"], reverse=True)


# ============================================================
# BULK OPERATIONS
# ============================================================
class BulkAssign(BaseModel):
    doctor_id: str
    patient_ids: List[str]


@router.post("/bulk-assign-patients")
def bulk_assign(
    body: BulkAssign,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    doctor = db.query(User).filter(User.id == body.doctor_id, User.role == UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    existing = {pid for (pid,) in db.query(DoctorPatient.patient_id).filter(
        DoctorPatient.doctor_id == body.doctor_id,
        DoctorPatient.patient_id.in_(body.patient_ids)
    ).all()}

    new_assignments = [pid for pid in body.patient_ids if pid not in existing]
    for pid in new_assignments:
        db.add(DoctorPatient(
            id=str(uuid.uuid4()),
            doctor_id=body.doctor_id,
            patient_id=pid,
            status="active",
        ))
    assigned = len(new_assignments)
    skipped = len(existing)
    db.commit()
    log_action(db, current_user, "create", "doctor_patient", body.doctor_id,
               f"Bulk assign {assigned} patients to {doctor.email}", request)
    return {"assigned": assigned, "skipped": skipped, "total": len(body.patient_ids)}


# ============================================================
# SYSTEM HEALTH (real)
# ============================================================
@router.get("/system-health")
def system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    from app.core.config import settings
    import os

    health = {"database": "unknown", "redis": "unknown", "ml_model": "unknown"}

    try:
        db.execute(text("SELECT 1"))
        health["database"] = "healthy"
    except Exception:
        health["database"] = "down"

    if settings.REDIS_ENABLED:
        try:
            import redis
            r = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT,
                            db=settings.REDIS_DB, socket_connect_timeout=2)
            r.ping()
            health["redis"] = "healthy"
        except Exception:
            health["redis"] = "down"
    else:
        health["redis"] = "disabled"

    ml_path = os.path.join(settings.ML_MODEL_PATH, "symptom_analysis", "symptom_xgb_model.joblib")
    health["ml_model"] = "healthy" if os.path.exists(ml_path) else "missing"

    # Stats
    health["stats"] = {
        "total_users": db.query(User).count(),
        "active_sessions": db.query(User).filter(User.last_login >= datetime.now(timezone.utc) - timedelta(hours=1)).count(),
        "total_records": db.query(MedicalRecord).count(),
    }
    return health


# ============================================================
# DIAGNOSES DISTRIBUTION (for chart)
# ============================================================
@router.get("/diagnoses-distribution")
def diagnoses_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    rows = db.query(
        MedicalRecord.ai_prediction,
        func.count(MedicalRecord.id).label("count")
    ).filter(
        MedicalRecord.ai_prediction.isnot(None)
    ).group_by(MedicalRecord.ai_prediction).order_by(desc("count")).limit(10).all()

    return [{"disease": r[0], "count": r[1]} for r in rows]


# ============================================================
# EXPORT (CSV)
# ============================================================
def _stream_csv(filename: str, headers: List[str], rows: List[List]) -> StreamingResponse:
    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(headers)
    for r in rows:
        w.writerow(r)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/users")
def export_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    rows = [[
        str(u.id), u.email,
        u.role.value if hasattr(u.role, 'value') else str(u.role),
        u.is_active,
        u.last_login.isoformat() if u.last_login else "",
        u.created_at.isoformat() if u.created_at else "",
    ] for u in users]
    return _stream_csv("users.csv", ["id", "email", "role", "is_active", "last_login", "created_at"], rows)


@router.get("/export/records")
def export_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    records = db.query(MedicalRecord).order_by(MedicalRecord.created_at.desc()).all()
    rows = [[
        str(r.id), str(r.patient_id), str(r.doctor_id) if r.doctor_id else "",
        r.ai_prediction or "",
        r.confidence_score or "",
        r.status,
        r.created_at.isoformat() if r.created_at else "",
    ] for r in records]
    return _stream_csv("records.csv", ["id", "patient_id", "doctor_id", "diagnosis", "confidence", "status", "created_at"], rows)


@router.get("/export/appointments")
def export_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    appts = db.query(Appointment).order_by(Appointment.created_at.desc()).all()
    rows = [[
        str(a.id), str(a.patient_id), a.specialist,
        a.date, a.time, a.status, a.reason or "",
    ] for a in appts]
    return _stream_csv("appointments.csv", ["id", "patient_id", "specialist", "date", "time", "status", "reason"], rows)
