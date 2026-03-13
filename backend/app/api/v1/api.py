from fastapi import APIRouter
from .endpoints import diagnosis, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(diagnosis.router, prefix="/diagnosis", tags=["diagnosis"])
