from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationCreate(BaseModel):
    user_id: str
    type: str
    title: str
    message: Optional[str] = None
    related_id: Optional[str] = None
    related_url: Optional[str] = None


class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: Optional[str]
    is_read: bool
    related_id: Optional[str]
    related_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
