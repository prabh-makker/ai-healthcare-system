"""Attendance marking endpoints for doctors."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.models.models import User, UserRole, AttendanceLog, LeaveApplication
from app.core.security import get_current_user, require_role
from app.core.pagination import validate_pagination

router = APIRouter()


class AttendanceMarkRequest(BaseModel):
    status: str  # "present" | "absent" | "leave" | "half_day" | "emergency" | "holiday"
    notes: Optional[str] = None


class LeaveApprovalRequest(BaseModel):
    status: str  # "approved" | "rejected"
    admin_notes: Optional[str] = None


class HolidayRequest(BaseModel):
    date: str  # YYYY-MM-DD
    name: str  # Holiday name (e.g., "Diwali", "Christmas")
    notes: Optional[str] = None


class AttendanceLogResponse(BaseModel):
    id: str
    user_id: str
    date: str
    status: str
    marked_at: str
    notes: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class LeaveApplicationRequest(BaseModel):
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    reason: str


class LeaveApplicationResponse(BaseModel):
    id: str
    user_id: str
    start_date: str
    end_date: str
    reason: str
    status: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("/mark", status_code=201)
def mark_attendance(
    body: AttendanceMarkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Mark attendance for today."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Check if already marked today
    existing = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == current_user.id,
        AttendanceLog.date == today
    ).first()

    if existing:
        # Update existing record
        existing.status = body.status
        existing.marked_at = datetime.now(timezone.utc)
        existing.notes = body.notes
        db.commit()
        return {
            "id": str(existing.id),
            "user_id": str(existing.user_id),
            "date": existing.date,
            "status": existing.status,
            "marked_at": existing.marked_at.isoformat() if existing.marked_at else None,
            "notes": existing.notes,
            "created_at": existing.created_at.isoformat() if existing.created_at else None,
        }
    else:
        # Create new record
        log = AttendanceLog(
            id=str(uuid.uuid4()),
            user_id=str(current_user.id),
            date=today,
            status=body.status,
            marked_at=datetime.now(timezone.utc),
            notes=body.notes,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return {
            "id": str(log.id),
            "user_id": str(log.user_id),
            "date": log.date,
            "status": log.status,
            "marked_at": log.marked_at.isoformat() if log.marked_at else None,
            "notes": log.notes,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }


@router.get("/my-status")
def get_my_attendance_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Get today's attendance status for current user."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    log = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == current_user.id,
        AttendanceLog.date == today
    ).first()

    if not log:
        return {
            "id": None,
            "date": today,
            "status": None,
            "notes": None,
            "marked_at": None,
            "marked": False,
        }

    return {
        "id": str(log.id),
        "date": log.date,
        "status": log.status,
        "notes": log.notes,
        "marked_at": log.marked_at.isoformat() if log.marked_at else None,
        "marked": True,
    }


@router.get("/logs")
def get_attendance_logs(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Get attendance logs for a specific month."""
    # Validate month and year
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")

    # Build date range
    month_str = f"{year}-{month:02d}"

    # Query all logs for this month
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == current_user.id,
        AttendanceLog.date.like(f"{month_str}%")
    ).all()

    # Convert to dict keyed by date
    result = {}
    for log in logs:
        result[log.date] = {
            "date": log.date,
            "status": log.status,
            "notes": log.notes,
            "marked_at": log.marked_at.isoformat() if log.marked_at else None,
        }

    return result


@router.post("/apply-leave", status_code=201)
def apply_leave(
    body: LeaveApplicationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Apply for leave."""
    # Validate dates
    try:
        start = datetime.strptime(body.start_date, "%Y-%m-%d")
        end = datetime.strptime(body.end_date, "%Y-%m-%d")

        if start > end:
            raise HTTPException(status_code=400, detail="Start date must be before end date")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Create leave application
    app = LeaveApplication(
        id=str(uuid.uuid4()),
        user_id=str(current_user.id),
        start_date=body.start_date,
        end_date=body.end_date,
        reason=body.reason,
        status="pending",
    )

    db.add(app)
    db.commit()
    db.refresh(app)

    return {
        "id": str(app.id),
        "user_id": str(app.user_id),
        "start_date": app.start_date,
        "end_date": app.end_date,
        "reason": app.reason,
        "status": app.status,
        "created_at": app.created_at.isoformat() if app.created_at else None,
    }


@router.get("/leave-applications")
def get_leave_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.DOCTOR)),
):
    """Get all leave applications for current user."""
    apps = db.query(LeaveApplication).filter(
        LeaveApplication.user_id == current_user.id
    ).order_by(LeaveApplication.created_at.desc()).all()

    return [
        {
            "id": str(app.id),
            "user_id": str(app.user_id),
            "start_date": app.start_date,
            "end_date": app.end_date,
            "reason": app.reason,
            "status": app.status,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        }
        for app in apps
    ]


# ─────────────── ADMIN ENDPOINTS ───────────────

@router.get("/admin/all-doctors-summary")
def admin_all_doctors_summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: List all doctors with their attendance summary for a month."""
    if not year or not month:
        now = datetime.now(timezone.utc)
        year = year or now.year
        month = month or now.month

    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")

    month_str = f"{year}-{month:02d}"

    # Get all doctors
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()

    result = []
    for doc in doctors:
        # Get attendance logs for this doctor in the month
        logs = db.query(AttendanceLog).filter(
            AttendanceLog.user_id == doc.id,
            AttendanceLog.date.like(f"{month_str}%")
        ).all()

        # Count statuses
        stats = {
            "present": 0,
            "absent": 0,
            "leave": 0,
            "half_day": 0,
            "emergency": 0,
            "holiday": 0,
        }
        for log in logs:
            if log.status in stats:
                stats[log.status] += 1

        # Get pending leave applications
        pending_leaves = db.query(LeaveApplication).filter(
            LeaveApplication.user_id == doc.id,
            LeaveApplication.status == "pending"
        ).count()

        total_marked = sum(stats.values())
        attendance_pct = round((stats["present"] / total_marked * 100), 1) if total_marked > 0 else 0

        result.append({
            "doctor_id": str(doc.id),
            "first_name": doc.first_name,
            "last_name": doc.last_name,
            "email": doc.email,
            "stats": stats,
            "total_marked": total_marked,
            "attendance_pct": attendance_pct,
            "pending_leaves": pending_leaves,
        })

    return result


@router.get("/admin/doctor/{doctor_id}")
def admin_doctor_attendance_detail(
    doctor_id: str,
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: Get specific doctor's attendance + leaves for a month."""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")

    doctor = db.query(User).filter(User.id == doctor_id, User.role == UserRole.DOCTOR).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    month_str = f"{year}-{month:02d}"

    # Attendance logs for the month
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == doctor_id,
        AttendanceLog.date.like(f"{month_str}%")
    ).all()

    attendance_by_date = {}
    for log in logs:
        attendance_by_date[log.date] = {
            "id": str(log.id),
            "date": log.date,
            "status": log.status,
            "notes": log.notes,
            "marked_at": log.marked_at.isoformat() if log.marked_at else None,
        }

    # Leave applications (all, not just for this month)
    leaves = db.query(LeaveApplication).filter(
        LeaveApplication.user_id == doctor_id
    ).order_by(LeaveApplication.created_at.desc()).all()

    return {
        "doctor": {
            "id": str(doctor.id),
            "first_name": doctor.first_name,
            "last_name": doctor.last_name,
            "email": doctor.email,
        },
        "attendance": attendance_by_date,
        "leaves": [
            {
                "id": str(l.id),
                "start_date": l.start_date,
                "end_date": l.end_date,
                "reason": l.reason,
                "status": l.status,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in leaves
        ],
    }


@router.get("/admin/pending-leaves")
def admin_pending_leaves(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: List all pending leave applications across all doctors."""
    leaves = db.query(LeaveApplication).filter(
        LeaveApplication.status == "pending"
    ).order_by(LeaveApplication.created_at.desc()).all()

    # Get doctor info for each leave
    result = []
    for leave in leaves:
        doctor = db.query(User).filter(User.id == leave.user_id).first()
        result.append({
            "id": str(leave.id),
            "doctor_id": str(leave.user_id),
            "doctor_name": f"{doctor.first_name or ''} {doctor.last_name or ''}".strip() if doctor else "Unknown",
            "doctor_email": doctor.email if doctor else None,
            "start_date": leave.start_date,
            "end_date": leave.end_date,
            "reason": leave.reason,
            "status": leave.status,
            "created_at": leave.created_at.isoformat() if leave.created_at else None,
        })

    return result


@router.post("/admin/leave/{leave_id}/decision")
def admin_decide_leave(
    leave_id: str,
    body: LeaveApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: Approve or reject a leave application."""
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    leave = db.query(LeaveApplication).filter(LeaveApplication.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")

    leave.status = body.status
    leave.updated_at = datetime.now(timezone.utc)

    # If approved, auto-create attendance entries for the leave period
    if body.status == "approved":
        try:
            start = datetime.strptime(leave.start_date, "%Y-%m-%d")
            end = datetime.strptime(leave.end_date, "%Y-%m-%d")
            current = start
            while current <= end:
                date_str = current.strftime("%Y-%m-%d")
                existing = db.query(AttendanceLog).filter(
                    AttendanceLog.user_id == leave.user_id,
                    AttendanceLog.date == date_str
                ).first()
                if existing:
                    existing.status = "leave"
                    existing.notes = f"Approved leave: {leave.reason[:80]}"
                else:
                    db.add(AttendanceLog(
                        id=str(uuid.uuid4()),
                        user_id=leave.user_id,
                        date=date_str,
                        status="leave",
                        marked_at=datetime.now(timezone.utc),
                        notes=f"Approved leave: {leave.reason[:80]}",
                    ))
                from datetime import timedelta
                current = current + timedelta(days=1)
        except Exception:
            pass  # Don't fail the approval if attendance create fails

    db.commit()
    db.refresh(leave)

    return {
        "id": str(leave.id),
        "status": leave.status,
        "updated_at": leave.updated_at.isoformat() if leave.updated_at else None,
    }


@router.post("/admin/mark-holiday")
def admin_mark_holiday(
    body: HolidayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """Admin: Mark a date as holiday for all doctors."""
    # Validate date
    try:
        datetime.strptime(body.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get all doctors
    doctors = db.query(User).filter(User.role == UserRole.DOCTOR).all()

    count = 0
    for doc in doctors:
        existing = db.query(AttendanceLog).filter(
            AttendanceLog.user_id == doc.id,
            AttendanceLog.date == body.date
        ).first()
        notes = f"Holiday: {body.name}" + (f" - {body.notes}" if body.notes else "")
        if existing:
            existing.status = "holiday"
            existing.notes = notes
        else:
            db.add(AttendanceLog(
                id=str(uuid.uuid4()),
                user_id=str(doc.id),
                date=body.date,
                status="holiday",
                marked_at=datetime.now(timezone.utc),
                notes=notes,
            ))
        count += 1

    db.commit()
    return {"date": body.date, "name": body.name, "doctors_affected": count}
