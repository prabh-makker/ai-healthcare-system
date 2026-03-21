"""
Prometheus metrics module for monitoring application performance and usage.
"""

import time
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Request
from typing import Callable
import logging

logger = logging.getLogger(__name__)

# HTTP Metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0)
)

# Error Metrics
error_count = Counter(
    'http_errors_total',
    'Total HTTP errors',
    ['method', 'endpoint', 'status_code', 'error_type']
)

validation_error_count = Counter(
    'validation_errors_total',
    'Total validation errors',
    ['endpoint', 'error_field']
)

# Application Metrics
active_requests = Gauge(
    'active_http_requests',
    'Number of active HTTP requests',
    ['method', 'endpoint']
)

# Database Metrics
database_connection_errors = Counter(
    'database_connection_errors_total',
    'Total database connection errors',
    ['operation']
)

database_query_duration = Histogram(
    'database_query_duration_seconds',
    'Database query duration in seconds',
    ['operation'],
    buckets=(0.001, 0.01, 0.05, 0.1, 0.5, 1.0)
)

# Authentication Metrics
authentication_attempts = Counter(
    'authentication_attempts_total',
    'Total authentication attempts',
    ['result']  # success, failure
)

failed_login_attempts = Counter(
    'failed_login_attempts_total',
    'Total failed login attempts',
    ['username_hash']
)

# Business Metrics
diagnosis_requests = Counter(
    'diagnosis_requests_total',
    'Total diagnosis requests',
    ['model', 'status']
)

active_users = Gauge(
    'active_users',
    'Number of currently active users'
)

# System Metrics
system_memory_usage = Gauge(
    'system_memory_usage_bytes',
    'System memory usage in bytes'
)

system_memory_available = Gauge(
    'system_memory_available_bytes',
    'System available memory in bytes'
)


async def metrics_middleware(request: Request, call_next) -> None:
    """
    Middleware to track HTTP request metrics.
    """
    method = request.method
    path = request.url.path

    # Track active requests
    active_requests.labels(method=method, endpoint=path).inc()

    # Record request start time
    start_time = time.time()

    try:
        response = await call_next(request)

        # Record metrics
        duration = time.time() - start_time
        status_code = response.status_code

        request_count.labels(
            method=method,
            endpoint=path,
            status_code=status_code
        ).inc()

        request_duration.labels(
            method=method,
            endpoint=path
        ).observe(duration)

        # Track errors
        if status_code >= 400:
            error_type = 'client_error' if status_code < 500 else 'server_error'
            error_count.labels(
                method=method,
                endpoint=path,
                status_code=status_code,
                error_type=error_type
            ).inc()

        return response

    finally:
        # Decrement active requests
        active_requests.labels(method=method, endpoint=path).dec()


def get_metrics() -> bytes:
    """
    Get current metrics in Prometheus format.
    """
    return generate_latest()


def get_metrics_content_type() -> str:
    """
    Get the content type for Prometheus metrics.
    """
    return CONTENT_TYPE_LATEST
