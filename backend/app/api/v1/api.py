from fastapi import APIRouter
from .endpoints import auth, diagnosis, records #, patients, appointments, search, batch, data, websocket

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(diagnosis.router, prefix="/diagnosis", tags=["diagnosis"])
# api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(records.router, prefix="/records", tags=["records"])
# api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
# api_router.include_router(search.router, prefix="/search", tags=["search"])
# api_router.include_router(batch.router, prefix="/batch", tags=["batch"])
# api_router.include_router(data.router, prefix="/data", tags=["data"])
# api_router.include_router(websocket.router, tags=["websocket"])
