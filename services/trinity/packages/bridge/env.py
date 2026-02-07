"""Bridge environment validation helpers."""

from pydantic import ValidationError

from config import Settings


def validate_env() -> Settings:
    """Load and validate Bridge settings with Pydantic."""
    try:
        return Settings()
    except ValidationError as exc:
        raise RuntimeError("Invalid Bridge environment variables") from exc


settings: Settings = validate_env()
