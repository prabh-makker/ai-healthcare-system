from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt, JWTError
import bcrypt
import re
import uuid as _uuid
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db

ALGORITHM = "HS256"
COOKIE_NAME = "access_token"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long"
    if settings.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if settings.PASSWORD_REQUIRE_NUMBERS and not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if settings.PASSWORD_REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?]', password):
        return False, "Password must contain at least one special character"
    return True, ""


def validate_email(email: str) -> tuple[bool, str]:
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    if len(email) > 255:
        return False, "Email address is too long"
    return True, ""


def sanitize_email(email: str) -> str:
    return email.strip().lower()


def sanitize_username(username: str) -> str:
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', username.strip())
    if len(sanitized) < 3:
        return ""
    return sanitized[:50]


def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise JWTError("No user ID in token")
        return user_id
    except JWTError as e:
        raise JWTError(f"Invalid token: {str(e)}")


def _extract_token(request: Request, bearer_token: Optional[str]) -> Optional[str]:
    """Read token from httpOnly cookie first, fall back to Authorization header."""
    cookie_token = request.cookies.get(COOKIE_NAME)
    if cookie_token:
        return cookie_token
    return bearer_token


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    bearer_token: Optional[str] = Depends(oauth2_scheme),
):
    from app.models.models import User

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = _extract_token(request, bearer_token)
    if not token:
        raise credentials_exception

    try:
        user_id = verify_token(token)
    except JWTError:
        raise credentials_exception

    # User IDs are stored as hyphenated UUID strings (36 chars)
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def require_role(*roles: str):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker
