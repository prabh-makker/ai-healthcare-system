"""
Structured logging configuration for the application.
"""

import logging
import logging.handlers
import json
from datetime import datetime
from pythonjsonlogger import jsonlogger
import os
from app.core.config import settings


class StructuredFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter for structured logging.
    """
    def add_fields(self, log_record, record, message_dict):
        super(StructuredFormatter, self).add_fields(log_record, record, message_dict)

        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat()

        # Add environment
        log_record['environment'] = settings.ENVIRONMENT

        # Add log level
        log_record['level'] = record.levelname

        # Add logger name
        log_record['logger'] = record.name

        # Add exception info if present
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)


def setup_logging() -> None:
    """
    Configure application logging with structured JSON format.
    """
    # Create logs directory if it doesn't exist
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
    try:
        os.makedirs(log_dir, exist_ok=True)
        logs_available = True
    except PermissionError:
        # Skip file logging if we can't create log directory
        logs_available = False

    # Get root logger
    root_logger = logging.getLogger()

    # Set log level based on environment
    log_level = getattr(logging, settings.LOG_LEVEL, logging.INFO)
    root_logger.setLevel(log_level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Create formatters
    json_formatter = StructuredFormatter()

    # Console handler (JSON format)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(json_formatter)
    console_handler.setLevel(log_level)
    root_logger.addHandler(console_handler)

    # File handler with rotation (JSON format) - only if logs dir is writable
    if logs_available:
        log_file = os.path.join(log_dir, 'app.log')
        try:
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=10
            )
            file_handler.setFormatter(json_formatter)
            file_handler.setLevel(log_level)
            root_logger.addHandler(file_handler)

            # Error file handler with rotation
            error_log_file = os.path.join(log_dir, 'error.log')
            error_handler = logging.handlers.RotatingFileHandler(
                error_log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=10
            )
            error_handler.setFormatter(json_formatter)
            error_handler.setLevel(logging.ERROR)
            root_logger.addHandler(error_handler)
        except PermissionError:
            # Skip file logging if permission denied
            pass

    # Configure uvicorn logger
    uvicorn_logger = logging.getLogger("uvicorn")
    uvicorn_logger.setLevel(log_level)

    # Configure sqlalchemy logger
    sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
    sqlalchemy_logger.setLevel(logging.WARNING)

    logging.info(f"Logging configured for {settings.ENVIRONMENT} environment")


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.

    Args:
        name: Logger name, typically __name__

    Returns:
        Logger instance
    """
    return logging.getLogger(name)
