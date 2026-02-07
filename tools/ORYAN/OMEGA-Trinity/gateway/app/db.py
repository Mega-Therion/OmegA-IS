from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from .config import settings

_engine: Engine | None = None

def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(settings.omega_db_url, future=True, pool_pre_ping=True)
    return _engine

def init_db() -> None:
    engine = get_engine()
    with engine.begin() as conn:
        # Ensure pgvector extension exists
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS omega_memory (
                id TEXT PRIMARY KEY,
                namespace TEXT NOT NULL,
                ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                content TEXT NOT NULL,
                meta JSONB NOT NULL DEFAULT '{}'::jsonb,
                embedding vector(1536)
            );
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_omega_memory_ns_ts ON omega_memory(namespace, ts DESC);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_omega_memory_embedding ON omega_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS omega_events (
                id TEXT PRIMARY KEY,
                ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                actor TEXT,
                event_type TEXT NOT NULL,
                payload_json JSONB NOT NULL,
                prev_hash TEXT,
                hash TEXT
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS omega_idempotency (
                key TEXT PRIMARY KEY,
                response_status INT NOT NULL,
                response_body BYTEA,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """))
