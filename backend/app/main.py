import logging
import json
import traceback
from datetime import datetime
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.metrics import metrics_middleware, get_metrics, get_metrics_content_type
from app.api.v1.api import api_router
from app.db.session import engine
from app.db.base_class import Base

# Initialize Sentry
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        profiles_sample_rate=settings.SENTRY_PROFILES_SAMPLE_RATE,
        environment=settings.ENVIRONMENT,
        release=getattr(settings, 'VERSION', '1.0.0'),
    )

# Setup structured logging
setup_logging()

logger = logging.getLogger(__name__)


def get_application() -> FastAPI:
    _app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    )

    # Add metrics middleware (will be added via decorator after CORS)
    metrics_enabled = settings.PROMETHEUS_METRICS_ENABLED

    # Add CORS middleware with specific origins
    _app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        max_age=600,
    )

    # Add security headers middleware
    @_app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

    # Log all requests
    @_app.middleware("http")
    async def log_requests(request: Request, call_next):
        body = await request.body()
        logger.info(
            f"Request: {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client": request.client.host if request.client else "unknown",
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        response = await call_next(request)
        logger.info(
            f"Response: {response.status_code} for {request.method} {request.url.path}",
            extra={
                "status_code": response.status_code,
                "method": request.method,
                "path": request.url.path,
            }
        )
        return response

    # Add metrics middleware if enabled
    if metrics_enabled:
        @_app.middleware("http")
        async def metrics_middleware_wrapper(request: Request, call_next):
            return await metrics_middleware(request, call_next)

    # Add health check endpoints
    from app.api.v1.endpoints.health import router as health_router
    _app.include_router(health_router, prefix="/api/v1")

    # Add Prometheus metrics endpoint
    @_app.get("/metrics")
    async def prometheus_metrics():
        return Response(get_metrics(), media_type=get_metrics_content_type())

    _app.include_router(api_router, prefix=settings.API_V1_STR)

    # Global exception handlers
    @_app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.error(
            f"HTTP Exception: {exc.status_code} - {exc.detail}",
            extra={
                "status_code": exc.status_code,
                "detail": exc.detail,
                "path": request.url.path,
            }
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {
                    "message": exc.detail,
                    "status_code": exc.status_code,
                },
                "data": None,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @_app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(
            f"Validation Error for {request.method} {request.url.path}: {exc}",
            extra={
                "path": request.url.path,
                "errors": exc.errors(),
            }
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "error": {
                    "message": "Validation error",
                    "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "details": exc.errors(),
                },
                "data": None,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @_app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unexpected error: {str(exc)}",
            extra={
                "path": request.url.path,
                "error": str(exc),
                "traceback": traceback.format_exc(),
            },
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "message": "Internal server error" if settings.ENVIRONMENT == "production" else str(exc),
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                },
                "data": None,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    @_app.on_event("startup")
    def on_startup():
        # Import all models so they are registered with Base
        from app.models.models import User, PatientProfile, DoctorProfile, MedicalRecord  # noqa
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")

    @_app.get("/")
    async def root():
        return {
            "message": "AI Healthcare Diagnosis System API",
            "version": "1.0.0",
            "docs": "/docs" if settings.ENVIRONMENT == "development" else None,
        }

    return _app


app = get_application()
