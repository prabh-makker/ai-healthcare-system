from fastapi import APIRouter
from .endpoints import auth, diagnosis, records, patients, appointments, prescriptions, medications, notifications, messages, admin, attendance, doctor_calendar, ws, disease_prediction

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(diagnosis.router, prefix="/diagnosis", tags=["diagnosis"])
api_router.include_router(disease_prediction.router, prefix="/disease", tags=["disease-prediction"])
api_router.include_router(records.router, prefix="/records", tags=["records"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(doctor_calendar.router, prefix="/doctor-calendar", tags=["doctor-calendar"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=["prescriptions"])
api_router.include_router(medications.router, prefix="/medications", tags=["medications"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ws.router, prefix="", tags=["websocket"])
