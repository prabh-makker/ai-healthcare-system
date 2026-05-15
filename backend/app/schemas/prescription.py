from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class PrescriptionCreate(BaseModel):
    patient_id: str
    medication_name: str
    dosage: str
    frequency: str
    instructions: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PrescriptionUpdate(BaseModel):
    status: Optional[str] = None  # active|completed|discontinued
    end_date: Optional[date] = None
    instructions: Optional[str] = None


class PrescriptionOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    medication_name: str
    dosage: Optional[str]
    frequency: Optional[str]
    instructions: Optional[str]
    start_date: datetime
    end_date: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
