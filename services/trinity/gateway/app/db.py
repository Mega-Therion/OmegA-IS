from sqlalchemy import create_engine, text, event
from sqlalchemy.engine import Engine
from datetime import datetime
from .config import settings

_engine: Engine | None = None

def get_engine() -> Engine:
    global _engine
    if _engine is None:
        db_url = settings.db_url or "sqlite:///gateway.db"
        if db_url.startswith("sqlite"):
            _engine = create_engine(db_url, future=True)
            
            # Register NOW() function for SQLite compatibility on EVERY connection
            @event.listens_for(_engine, "connect")
            def _register_sqlite_now(dbapi_connection, connection_record):
                print("DEBUG: Registering SQLite NOW() function")
                dbapi_connection.create_function("NOW", 0, lambda: datetime.now().isoformat())
        else:
            _engine = create_engine(db_url, future=True, pool_pre_ping=True)
    return _engine

def init_db() -> None:
    engine = get_engine()
    dialect = engine.dialect.name
    
    with engine.begin() as conn:
        if dialect == "postgresql":
            # Ensure pgvector extension exists (Postgres only)
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_memory (
                    id TEXT PRIMARY KEY,
                    namespace TEXT NOT NULL,
                    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    content TEXT NOT NULL,
                    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
                    embedding vector(1536),
                    importance FLOAT DEFAULT 1.0
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
        else:
            # SQLite-compatible schema (no vector, no JSONB, no TIMESTAMPTZ)
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_memory (
                    id TEXT PRIMARY KEY,
                    namespace TEXT NOT NULL,
                    ts TEXT NOT NULL DEFAULT (datetime('now')),
                    content TEXT NOT NULL,
                    meta TEXT NOT NULL DEFAULT '{}'
                );
            """))
            # Backfill missing columns for existing SQLite DBs.
            cols = [row[1] for row in conn.execute(text("PRAGMA table_info(omega_memory)"))]
            if "embedding" not in cols:
                conn.execute(text("ALTER TABLE omega_memory ADD COLUMN embedding TEXT DEFAULT '[]';"))
            if "importance" not in cols:
                conn.execute(text("ALTER TABLE omega_memory ADD COLUMN importance FLOAT DEFAULT 1.0;"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_omega_memory_ns_ts ON omega_memory(namespace, ts);"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_events (
                    id TEXT PRIMARY KEY,
                    ts TEXT NOT NULL DEFAULT (datetime('now')),
                    actor TEXT,
                    event_type TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    prev_hash TEXT,
                    hash TEXT
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_idempotency (
                    key TEXT PRIMARY KEY,
                    response_status INTEGER NOT NULL,
                    response_body BLOB,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            """))
