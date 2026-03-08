from fastapi import APIRouter
from .endpoints import diagnosis

api_router = APIRouter()
api_router.include_router(diagnosis.router, prefix="/diagnosis", tags=["diagnosis"])
