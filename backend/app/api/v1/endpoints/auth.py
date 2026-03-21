from fastapi import APIRouter, Depends, HTTPException, status
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
from app.core.security import get_current_user, validate_password_strength, validate_email, sanitize_email
from app.core.rate_limit import auth_rate_limiter

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=201)
def register_user(*, db: Session = Depends(get_db), user_in: UserCreate) -> Any:
    """
    Register a new user.
    Validates password strength, email format, and checks for duplicates.
    """
    # Validate and sanitize email
    is_valid, error_msg = validate_email(user_in.email)
    if not is_valid:
        logger.warning(f"Invalid email format attempted: {user_in.email}")
        raise HTTPException(status_code=400, detail=error_msg)

    email_sanitized = sanitize_email(user_in.email)

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email_sanitized).first()
    if existing_user:
        logger.warning(f"Duplicate registration attempt for email: {email_sanitized}")
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    # Validate password strength
    is_valid, error_msg = validate_password_strength(user_in.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Validate and normalize role
    role = user_in.role.upper() if user_in.role else "PATIENT"
    if role not in ("PATIENT", "DOCTOR", "ADMIN"):
        role = "PATIENT"

    # Create new user
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
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    Login user and return access token.
    Implements rate limiting on failed attempts.
    """
    email_sanitized = sanitize_email(form_data.username)

    # Check rate limiting
    if settings.RATE_LIMIT_ENABLED:
        is_allowed, error_msg = auth_rate_limiter.is_allowed(email_sanitized)
        if not is_allowed:
            logger.warning(f"Rate limit exceeded for email: {email_sanitized}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )

    # Verify credentials
    user = db.query(User).filter(User.email == email_sanitized).first()
    password_valid = user and security.verify_password(form_data.password, user.hashed_password)

    if not password_valid:
        auth_rate_limiter.record_attempt(email_sanitized, False)
        logger.warning(f"Failed login attempt for email: {email_sanitized}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        auth_rate_limiter.record_attempt(email_sanitized, False)
        logger.warning(f"Login attempt for inactive user: {email_sanitized}")
        raise HTTPException(status_code=400, detail="User account is inactive")

    # Record successful attempt
    auth_rate_limiter.record_attempt(email_sanitized, True)

    # Generate token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    logger.info(f"User logged in: {user.id}")
    return {
        "access_token": security.create_access_token(user.id, expires_delta=access_token_expires),
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return current_user
