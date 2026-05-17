from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel, Field, field_validator
from typing import Any, List, Dict
import logging

from app.db.session import get_db
from app.models.models import User, Message, DoctorPatient
from app.core.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_MESSAGE_LENGTH = 5000


class MessageCreate(BaseModel):
    receiver_id: str
    content: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH)

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Message content cannot be empty")
        return v.strip()


@router.post("/", status_code=201)
def send_message(
    body: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Send a message to another user (doctor-patient only)."""
    # Validate receiver exists
    receiver = db.query(User).filter(User.id == body.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    # Validate they have a doctor-patient relationship
    if current_user.role == "DOCTOR":
        # Doctor messaging a patient - check assignment
        assignment = (
            db.query(DoctorPatient)
            .filter(
                DoctorPatient.doctor_id == current_user.id,
                DoctorPatient.patient_id == body.receiver_id,
                DoctorPatient.status == "active",
            )
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=403, detail="Patient not assigned to you")
    elif current_user.role == "PATIENT":
        # Patient messaging a doctor - check assignment
        assignment = (
            db.query(DoctorPatient)
            .filter(
                DoctorPatient.patient_id == current_user.id,
                DoctorPatient.doctor_id == body.receiver_id,
                DoctorPatient.status == "active",
            )
            .first()
        )
        if not assignment:
            raise HTTPException(status_code=403, detail="Doctor not assigned to you")
    else:
        # Any other role (admin or unknown) is not allowed to send messages
        raise HTTPException(status_code=403, detail="Only doctors and patients can send messages")

    message = Message(
        sender_id=current_user.id,
        receiver_id=body.receiver_id,
        content=body.content,
        is_read=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content,
        "is_read": message.is_read,
        "created_at": message.created_at.isoformat(),
    }


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """List all conversations for the current user."""
    # Get all messages involving the current user
    messages = (
        db.query(Message)
        .filter(
            or_(
                Message.sender_id == current_user.id,
                Message.receiver_id == current_user.id,
            )
        )
        .order_by(Message.created_at.desc())
        .all()
    )

    # Find all unique "other user" IDs (avoids N+1)
    other_ids = set()
    for msg in messages:
        other_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        other_ids.add(other_id)

    # Batch load all users in one query
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(other_ids)).all()} if other_ids else {}

    # Batch load unread counts grouped by sender in one query
    from sqlalchemy import func
    unread_rows = (
        db.query(Message.sender_id, func.count(Message.id))
        .filter(
            Message.sender_id.in_(other_ids) if other_ids else False,
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        )
        .group_by(Message.sender_id)
        .all()
    ) if other_ids else []
    unread_map = {sender_id: count for sender_id, count in unread_rows}

    # Group by other user (uses precomputed maps, no per-iteration DB queries)
    conversations: Dict[str, Any] = {}
    for msg in messages:
        other_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        if other_id not in conversations:
            other_user = users_map.get(other_id)
            conversations[other_id] = {
                "user_id": other_id,
                "user_email": other_user.email if other_user else "Unknown",
                "user_name": other_user.email.split("@")[0] if other_user else "Unknown",
                "user_role": other_user.role if other_user else "Unknown",
                "last_message": msg.content,
                "last_message_at": msg.created_at.isoformat(),
                "unread_count": unread_map.get(other_id, 0),
            }

    return list(conversations.values())


@router.get("/{user_id}")
def get_conversation(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Get all messages between current user and specified user."""
    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
                and_(Message.sender_id == user_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    # Mark received messages as read
    (
        db.query(Message)
        .filter(
            Message.sender_id == user_id,
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        )
        .update({"is_read": True})
    )
    db.commit()

    return [
        {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "is_read": msg.is_read,
            "created_at": msg.created_at.isoformat(),
            "is_mine": msg.sender_id == current_user.id,
        }
        for msg in messages
    ]
