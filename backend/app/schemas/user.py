from pydantic import BaseModel, field_validator, field_serializer
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum
import uuid as _uuid


class UserRole(str, Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class UserBase(BaseModel):
    email: Optional[str] = None
    is_active: Optional[bool] = True
    role: UserRole = UserRole.PATIENT


class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "PATIENT"


class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: Any
    email: str
    role: str
    is_active: bool
    created_at: datetime

    @field_serializer("id")
    def serialize_id(self, v: Any) -> str:
        return str(v)

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
