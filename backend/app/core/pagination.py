"""Pagination utilities for consistent parameter validation across endpoints."""

from fastapi import HTTPException


def validate_pagination(skip: int, limit: int) -> None:
    """
    Validate pagination parameters.

    Args:
        skip: Number of records to skip (must be >= 0)
        limit: Number of records to return (max 100)

    Raises:
        HTTPException: If parameters are invalid
    """
    if limit > 100:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 100.")
    if skip < 0:
        raise HTTPException(status_code=400, detail="Skip cannot be negative.")
