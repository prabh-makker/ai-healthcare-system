from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, List, Dict
import logging

from app.db.session import get_db
from app.models.models import User, Notification
from app.schemas.notification import NotificationOut
from app.core.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
) -> Any:
    """Get notifications for the current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = (
        query
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return notifications


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, int]:
    """Get count of unread notifications."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .count()
    )
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, str]:
    """Mark a notification as read."""
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    notification.is_read = True
    db.commit()
    return {"status": "marked as read"}


@router.patch("/mark-all-read")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, int]:
    """Mark all notifications as read for the current user."""
    updated = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .update({"is_read": True})
    )
    db.commit()
    return {"marked_read_count": updated}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(notification)
    db.commit()


def create_notification(
    db: Session,
    user_id: str,
    notification_type: str,
    title: str,
    message: str = None,
    related_id: str = None,
    related_url: str = None,
) -> Notification:
    """
    Helper function to create a notification.
    Used by other endpoints (prescriptions, appointments, etc.) to auto-create notifications.
    """
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        related_id=related_id,
        related_url=related_url,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
