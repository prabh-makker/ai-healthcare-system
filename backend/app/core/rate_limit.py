from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple
from fastapi import HTTPException, status
import logging
import threading

from app.core.file_storage import JSONFileStorage

logger = logging.getLogger(__name__)


class RateLimiter:
    """File-based persistent rate limiter for authentication endpoints."""

    def __init__(self, max_attempts: int = 5, window_minutes: int = 15, persist_file: str = ".rate_limit_data.json"):
        self.max_attempts = max_attempts
        self.window_minutes = window_minutes
        self.storage = JSONFileStorage(persist_file)
        # Store: {identifier: [(timestamp_str, was_success), ...]}
        self.attempts: Dict[str, list] = self.storage.load()

    def is_allowed(self, identifier: str) -> Tuple[bool, str]:
        """
        Check if request is allowed based on rate limit.
        Returns (is_allowed, message)
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=self.window_minutes)

        # Clean old entries and parse timestamps
        if identifier in self.attempts:
            valid_attempts = []
            for timestamp_str, success in self.attempts[identifier]:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                    if timestamp > window_start:
                        valid_attempts.append((timestamp, success))
                except (ValueError, TypeError):
                    # Skip malformed timestamps
                    pass
            self.attempts[identifier] = [(t.isoformat(), s) for t, s in valid_attempts]

        # Get failed attempts in current window
        if identifier in self.attempts:
            failed_attempts = sum(1 for _, success in self.attempts[identifier] if not success)
        else:
            failed_attempts = 0

        if failed_attempts >= self.max_attempts:
            try:
                # Find oldest failed attempt to calculate remaining lockout time
                failed_attempts_list = [
                    datetime.fromisoformat(ts)
                    for ts, success in self.attempts[identifier]
                    if not success
                ]
                if failed_attempts_list:
                    oldest_failed = min(failed_attempts_list)
                    remaining_time = int(
                        (oldest_failed + timedelta(minutes=self.window_minutes) - now).total_seconds() / 60
                    ) + 1
                else:
                    remaining_time = self.window_minutes
            except (ValueError, TypeError):
                remaining_time = self.window_minutes
            return False, f"Too many failed login attempts. Try again in {remaining_time} minutes."

        return True, ""

    def record_attempt(self, identifier: str, success: bool) -> None:
        """Record an authentication attempt."""
        if identifier not in self.attempts:
            self.attempts[identifier] = []

        now = datetime.now(timezone.utc)
        self.attempts[identifier].append((now.isoformat(), success))

        # Log suspicious activity
        if not success:
            failed_count = sum(1 for _, s in self.attempts[identifier] if not s)
            if failed_count >= self.max_attempts - 1:
                logger.warning(f"High number of failed login attempts for {identifier}: {failed_count}")

        # Persist to disk asynchronously (non-blocking)
        save_thread = threading.Thread(target=self.storage.save, args=(self.attempts,), daemon=True)
        save_thread.start()

# Global rate limiter instance (initialized with settings)
from app.core.config import settings

auth_rate_limiter = RateLimiter(
    max_attempts=settings.RATE_LIMIT_AUTH_ATTEMPTS,
    window_minutes=settings.RATE_LIMIT_WINDOW_MINUTES,
)
