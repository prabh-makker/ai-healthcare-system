import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Project configuration
    PROJECT_NAME: str = "AI Healthcare Diagnosis System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Token configuration
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520  # 8 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str = "sqlite:///./healthcare.db"

    # CORS (stored as comma-separated string in env, parsed to list)
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_AUTH_ATTEMPTS: int = 5
    RATE_LIMIT_WINDOW_MINUTES: int = 15

    # ML Model path
    ML_MODEL_PATH: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"

    # Sentry Configuration
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1

    # Prometheus Configuration
    PROMETHEUS_METRICS_ENABLED: bool = True

    # Validation
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL_CHARS: bool = True

    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]


settings = Settings()
