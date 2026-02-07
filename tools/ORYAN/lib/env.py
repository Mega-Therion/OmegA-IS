from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, ValidationError, field_validator


_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
_ENV_KEYS = (
    "ORYAN_DB_PATH",
    "ORYAN_DEFAULT_AGENT",
    "GEMINI_API_KEY",
    "ANTHROPIC_API_KEY",
)
_ALLOWED_AGENTS = ("codex", "claude", "gemini")


class EnvSettings(BaseModel):
    oryan_db_path: Optional[Path] = Field(default=None, alias="ORYAN_DB_PATH")
    oryan_default_agent: Optional[str] = Field(default=None, alias="ORYAN_DEFAULT_AGENT")
    gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, alias="ANTHROPIC_API_KEY")

    @field_validator("oryan_default_agent")
    @classmethod
    def _validate_agent(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if value not in _ALLOWED_AGENTS:
            raise ValueError("must be one of: codex, claude, gemini")
        return value

    @field_validator("gemini_api_key", "anthropic_api_key")
    @classmethod
    def _validate_non_empty(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        if not value.strip():
            raise ValueError("must be non-empty when set")
        return value


def _load_env_file(env_path: Path = _ENV_PATH) -> None:
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        value = value.strip()
        if value and value[0] in {"'", '"'} and value[-1:] == value[0]:
            value = value[1:-1]
        os.environ.setdefault(key, value)


def get_settings() -> EnvSettings:
    _load_env_file()
    data = {key: os.environ.get(key) for key in _ENV_KEYS if key in os.environ}
    return EnvSettings.model_validate(data)


def validate_env() -> EnvSettings:
    try:
        return get_settings()
    except ValidationError as exc:
        print("Invalid environment configuration:", file=sys.stderr)
        for err in exc.errors():
            field = ".".join(str(part) for part in err["loc"])
            print(f"- {field}: {err['msg']}", file=sys.stderr)
        raise SystemExit(2)
