"""Redis-based rate limiter for high-performance authentication."""

import redis
import logging
from typing import Tuple
from datetime import timedelta
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    """Redis-backed rate limiter for distributed systems."""

    def __init__(
        self,
        max_attempts: int = 3,
        window_minutes: int = 15,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
    ):
        self.max_attempts = max_attempts
        self.window_minutes = window_minutes
        self.window_seconds = window_minutes * 60
        try:
            self.redis = redis.Redis(
                host=host,
                port=port,
                db=db,
                decode_responses=True,
                socket_connect_timeout=5,
            )
            # Test connection
            self.redis.ping()
            logger.info(f"Redis rate limiter initialized: {host}:{port}")
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    def is_allowed(self, identifier: str) -> Tuple[bool, str]:
        """
        Check if request is allowed based on rate limit.
        Returns (is_allowed, message)
        """
        key = f"rate_limit:{identifier}"

        try:
            # Get current attempt count
            attempts = self.redis.get(key)
            current_attempts = int(attempts) if attempts else 0

            if current_attempts >= self.max_attempts:
                # Get TTL to show remaining time
                ttl = self.redis.ttl(key)
                remaining_minutes = (ttl // 60) + 1 if ttl > 0 else self.window_minutes
                return (
                    False,
                    f"Too many failed login attempts. Try again in {remaining_minutes} minutes.",
                )

            return True, ""
        except Exception as e:
            logger.error(f"Redis rate limit check error: {e}")
            # Fail open - allow request if Redis fails
            return True, ""

    def record_attempt(self, identifier: str, success: bool) -> None:
        """Record an authentication attempt."""
        if success:
            # Clear counter on successful login
            key = f"rate_limit:{identifier}"
            self.redis.delete(key)
            return

        key = f"rate_limit:{identifier}"

        try:
            # Increment counter with window expiry
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, self.window_seconds)
            pipe.execute()

            # Log suspicious activity
            attempts = self.redis.get(key)
            if attempts:
                attempt_count = int(attempts)
                if attempt_count >= self.max_attempts - 1:
                    logger.warning(f"High number of failed login attempts for {identifier}: {attempt_count}")
        except Exception as e:
            logger.error(f"Redis record attempt error: {e}")


# Initialize global instance
redis_rate_limiter = RedisRateLimiter(
    max_attempts=settings.RATE_LIMIT_AUTH_ATTEMPTS if hasattr(settings, "RATE_LIMIT_AUTH_ATTEMPTS") else 3,
    window_minutes=settings.RATE_LIMIT_WINDOW_MINUTES if hasattr(settings, "RATE_LIMIT_WINDOW_MINUTES") else 15,
    host=settings.REDIS_HOST if hasattr(settings, "REDIS_HOST") else "localhost",
    port=settings.REDIS_PORT if hasattr(settings, "REDIS_PORT") else 6379,
)
