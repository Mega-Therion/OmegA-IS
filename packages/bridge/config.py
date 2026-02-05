"""
Bridge package configuration using Pydantic v2 BaseSettings.

Provides environment variable validation and type-safe access to configuration.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Bridge service configuration settings.

    All settings can be configured via environment variables or .env file.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -------------------------------------------------------------------------
    # LLM Configuration
    # -------------------------------------------------------------------------

    github_token: str | None = Field(
        default=None,
        description="GitHub token for GitHub Models API access",
    )

    openai_api_key: str | None = Field(
        default=None,
        description="OpenAI API key for OpenAI provider",
    )

    llm_provider: Literal["github", "openai", "azure", "ollama"] = Field(
        default="github",
        description="LLM provider selection: 'github', 'openai', 'azure', or 'ollama'",
    )

    ollama_base_url: str = Field(
        default="http://localhost:11434/v1",
        description="Ollama base URL (OpenAI-compatible)",
    )

    ollama_model: str = Field(
        default="llama3",
        description="Ollama model to use",
    )

    # -------------------------------------------------------------------------
    # Memory Layer Configuration
    # -------------------------------------------------------------------------

    redis_url: str | None = Field(
        default=None,
        description="Redis connection URL for SessionMemory",
    )

    milvus_host: str = Field(
        default="localhost",
        description="Milvus host for SemanticMemory vector embeddings",
    )

    milvus_port: int = Field(
        default=19530,
        description="Milvus port for SemanticMemory",
    )

    neo4j_uri: str = Field(
        default="bolt://localhost:7687",
        description="Neo4j connection URI for RelationalMemory",
    )

    neo4j_user: str = Field(
        default="neo4j",
        description="Neo4j username",
    )

    neo4j_password: str | None = Field(
        default=None,
        description="Neo4j password",
    )

    # -------------------------------------------------------------------------
    # Logging & Debug
    # -------------------------------------------------------------------------

    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        description="Logging level: DEBUG, INFO, WARNING, or ERROR",
    )

    debug: bool = Field(
        default=False,
        description="Enable verbose debug output",
    )

    # -------------------------------------------------------------------------
    # Deployment
    # -------------------------------------------------------------------------

    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        description="Deployment environment",
    )

    port: int = Field(
        default=8000,
        description="API server port",
        ge=1,
        le=65535,
    )

    host: str = Field(
        default="0.0.0.0",
        description="API server host address",
    )

    # -------------------------------------------------------------------------
    # Consensus
    # -------------------------------------------------------------------------

    consensus_quorum_ratio: float = Field(
        default=2 / 3,
        description="Quorum ratio for consensus (default 0.66)",
        ge=0.5,
        le=1.0,
    )

    consensus_fallback_mode: Literal["strict", "degraded"] = Field(
        default="strict",
        description="Consensus fallback mode when quorum is not reached",
    )

    consensus_fallback_quorum_ratio: float = Field(
        default=1 / 2,
        description="Fallback quorum ratio when degraded mode is enabled",
        ge=0.5,
        le=1.0,
    )

    # -------------------------------------------------------------------------
    # Validators
    # -------------------------------------------------------------------------

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, v: str) -> str:
        """Normalize log level to uppercase."""
        if isinstance(v, str):
            return v.upper()
        return v

    @field_validator("llm_provider", mode="before")
    @classmethod
    def normalize_llm_provider(cls, v: str) -> str:
        """Normalize LLM provider to lowercase."""
        if isinstance(v, str):
            return v.lower()
        return v


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance.

    Uses lru_cache to ensure settings are only loaded once.

    Returns:
        Settings: The application settings instance.
    """
    return Settings()


# Singleton instance for convenient access
settings: Settings = get_settings()
