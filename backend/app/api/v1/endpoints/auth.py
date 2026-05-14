from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Any
import logging

from app.db.session import get_db
from app.models.models import User
from app.schemas.user import UserCreate, UserOut, Token
from app.core import security
from app.core.config import settings
from app.core.security import get_current_user, validate_password_strength, validate_email, sanitize_email, COOKIE_NAME

logger = logging.getLogger(__name__)

# Use Redis rate limiter if enabled, fall back to file-based
if settings.REDIS_ENABLED:
    try:
        from app.core.redis_rate_limit import redis_rate_limiter as auth_rate_limiter
        logger.info("Using Redis rate limiter")
    except Exception as e:
        logger.warning(f"Redis not available, falling back to file-based: {e}")
        from app.core.rate_limit import auth_rate_limiter
else:
    from app.core.rate_limit import auth_rate_limiter

router = APIRouter()

COOKIE_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


@router.post("/register", response_model=UserOut, status_code=201)
def register_user(*, db: Session = Depends(get_db), user_in: UserCreate) -> Any:
    is_valid, error_msg = validate_email(user_in.email)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    email_sanitized = sanitize_email(user_in.email)

    existing_user = db.query(User).filter(User.email == email_sanitized).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    is_valid, error_msg = validate_password_strength(user_in.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    role = user_in.role.upper() if user_in.role else "PATIENT"
    if role not in ("PATIENT", "DOCTOR", "ADMIN"):
        role = "PATIENT"

    db_user = User(
        email=email_sanitized,
        hashed_password=security.get_password_hash(user_in.password),
        role=role,
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(f"New user registered: {db_user.id} with role {role}")
        return db_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error registering user: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error creating user")


@router.post("/login", response_model=Token)
def login_access_token(
    response: Response,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    email_sanitized = sanitize_email(form_data.username)

    if settings.RATE_LIMIT_ENABLED:
        is_allowed, error_msg = auth_rate_limiter.is_allowed(email_sanitized)
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )

    user = db.query(User).filter(User.email == email_sanitized).first()
    password_valid = user and security.verify_password(form_data.password, user.hashed_password)

    if not password_valid:
        auth_rate_limiter.record_attempt(email_sanitized, False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        auth_rate_limiter.record_attempt(email_sanitized, False)
        raise HTTPException(status_code=400, detail="User account is inactive")

    auth_rate_limiter.record_attempt(email_sanitized, True)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(user.id, expires_delta=access_token_expires)

    # Set httpOnly cookie — primary auth mechanism
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
        secure=settings.ENVIRONMENT == "production",
        path="/",
    )

    logger.info(f"User logged in: {user.id}")
    # Also return token in body for API/tooling clients
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
