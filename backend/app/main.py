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

    # Add CORS middleware with explicit method/header allowlists (no wildcards for security)
    # max_age=600 (10 min) prevents repeated preflight requests
    _app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),  # Configured in settings, allows dev/prod URLs
        allow_credentials=True,  # Allow cookies for session-based auth
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  # Standard REST + preflight
        allow_headers=["Content-Type", "Authorization"],  # Request headers allowed from browser
        max_age=600,  # Cache preflight responses for 10 minutes
    )

    # Add security headers middleware
    @_app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Strict Content-Security-Policy - only allow from same origin by default
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'nonce-{nonce}'; "
            "img-src 'self' data: blob: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' http://localhost:* https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers["Content-Security-Policy"] = csp
        return response

    # Log all requests
    @_app.middleware("http")
    async def log_requests(request: Request, call_next):
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
        from app.models.models import User, PatientProfile, DoctorProfile, MedicalRecord  # noqa
        from sqlalchemy import text, inspect
        import os
        import joblib

        Base.metadata.create_all(bind=engine)
        # Add new columns to existing DB if missing (works for SQLite + PG)
        insp = inspect(engine)
        mr_cols = {c["name"] for c in insp.get_columns("medical_record")}
        user_cols = {c["name"] for c in insp.get_columns("user")}
        pending_alters = []
        if "status" not in mr_cols:
            pending_alters.append("ALTER TABLE medical_record ADD COLUMN status VARCHAR DEFAULT 'pending'")
        if "doctor_notes" not in mr_cols:
            pending_alters.append("ALTER TABLE medical_record ADD COLUMN doctor_notes TEXT")
        if "last_login" not in user_cols:
            pending_alters.append('ALTER TABLE "user" ADD COLUMN last_login TIMESTAMP')
        if pending_alters:
            with engine.connect() as conn:
                for sql in pending_alters:
                    conn.execute(text(sql))
                conn.commit()
        logger.info("Database tables created successfully")

        # Pre-load ML model to avoid latency on first request
        try:
            ml_path = os.path.join(settings.ML_MODEL_PATH, "symptom_analysis")
            model_file = os.path.join(ml_path, "symptom_xgb_model.joblib")
            if os.path.exists(model_file):
                joblib.load(model_file)
                logger.info("ML model pre-loaded successfully")
        except Exception as e:
            logger.warning(f"Could not pre-load ML model: {e}")

    @_app.get("/")
    async def root():
        return {
            "message": "AI Healthcare Diagnosis System API",
            "version": "1.0.0",
            "docs": "/docs" if settings.ENVIRONMENT == "development" else None,
        }

    return _app


app = get_application()
