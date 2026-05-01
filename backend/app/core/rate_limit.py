from datetime import datetime, timedelta
from typing import Dict, Tuple
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple in-memory rate limiter for authentication endpoints."""

    def __init__(self, max_attempts: int = 5, window_minutes: int = 15):
        self.max_attempts = max_attempts
        self.window_minutes = window_minutes
        # Store: {identifier: [(timestamp, was_success), ...]}
        self.attempts: Dict[str, list] = {}

    def is_allowed(self, identifier: str) -> Tuple[bool, str]:
        """
        Check if request is allowed based on rate limit.
        Returns (is_allowed, message)
        """
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=self.window_minutes)

        # Clean old entries
        if identifier in self.attempts:
            self.attempts[identifier] = [
                (timestamp, success) for timestamp, success in self.attempts[identifier]
                if timestamp > window_start
            ]

        # Get failed attempts in current window
        if identifier in self.attempts:
            failed_attempts = sum(1 for _, success in self.attempts[identifier] if not success)
        else:
            failed_attempts = 0

        if failed_attempts >= self.max_attempts:
            remaining_time = int(
                (self.attempts[identifier][-self.max_attempts][0] + timedelta(minutes=self.window_minutes) - now).total_seconds() / 60
            ) + 1
            return False, f"Too many failed login attempts. Try again in {remaining_time} minutes."

        return True, ""

    def record_attempt(self, identifier: str, success: bool) -> None:
        """Record an authentication attempt."""
        if identifier not in self.attempts:
            self.attempts[identifier] = []

        self.attempts[identifier].append((datetime.utcnow(), success))

        # Log suspicious activity
        if not success:
            failed_count = sum(1 for _, s in self.attempts[identifier] if not s)
            if failed_count >= self.max_attempts - 1:
                logger.warning(f"High number of failed login attempts for {identifier}: {failed_count}")


# Global rate limiter instance
auth_rate_limiter = RateLimiter()
