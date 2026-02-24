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
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_task_graph (
                    mission_id TEXT PRIMARY KEY,
                    mission_description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    graph_json JSONB NOT NULL
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_sub_tasks (
                    id TEXT PRIMARY KEY,
                    mission_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    depends_on JSONB NOT NULL,
                    assigned_agent TEXT NOT NULL,
                    status TEXT NOT NULL,
                    output TEXT,
                    FOREIGN KEY (mission_id) REFERENCES omega_task_graph(mission_id)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_task_graph (
                    mission_id TEXT PRIMARY KEY,
                    mission_description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    graph_json JSONB NOT NULL
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_sub_tasks (
                    id TEXT PRIMARY KEY,
                    mission_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    depends_on JSONB NOT NULL,
                    assigned_agent TEXT NOT NULL,
                    status TEXT NOT NULL,
                    output TEXT,
                    FOREIGN KEY (mission_id) REFERENCES omega_task_graph(mission_id)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_sub_tasks (
                    id TEXT PRIMARY KEY,
                    mission_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    depends_on TEXT NOT NULL,
                    assigned_agent TEXT NOT NULL,
                    status TEXT NOT NULL,
                    output TEXT,
                    FOREIGN KEY (mission_id) REFERENCES omega_task_graph(mission_id)
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
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_state (
                    id TEXT PRIMARY KEY,
                    mode TEXT NOT NULL,
                    focus_topic TEXT,
                    energy_level FLOAT NOT NULL,
                    mood TEXT NOT NULL,
                    active_conversation_id TEXT,
                    active_task_ids JSONB,
                    current_goals JSONB,
                    session_started_at TIMESTAMPTZ,
                    last_interaction_at TIMESTAMPTZ,
                    interactions_today INTEGER,
                    last_reflection_at TIMESTAMPTZ,
                    pending_reflections JSONB,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_kinetic_memory (
                    id TEXT PRIMARY KEY,
                    device_id TEXT NOT NULL,
                    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    command TEXT,
                    telemetry JSONB,
                    impact_score FLOAT DEFAULT 1.0,
                    meta JSONB DEFAULT '{}'::jsonb
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
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_state (
                    id TEXT PRIMARY KEY,
                    mode TEXT NOT NULL,
                    focus_topic TEXT,
                    energy_level FLOAT NOT NULL,
                    mood TEXT NOT NULL,
                    active_conversation_id TEXT,
                    active_task_ids TEXT,
                    current_goals TEXT,
                    session_started_at TEXT,
                    last_interaction_at TEXT,
                    interactions_today INTEGER,
                    last_reflection_at TEXT,
                    pending_reflections TEXT,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_task_graph (
                    mission_id TEXT PRIMARY KEY,
                    mission_description TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    graph_json TEXT NOT NULL
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_sub_tasks (
                    id TEXT PRIMARY KEY,
                    mission_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    depends_on TEXT NOT NULL,
                    assigned_agent TEXT NOT NULL,
                    status TEXT NOT NULL,
                    output TEXT,
                    FOREIGN KEY (mission_id) REFERENCES omega_task_graph(mission_id)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_kinetic_memory (
                    id TEXT PRIMARY KEY,
                    device_id TEXT NOT NULL,
                    ts TEXT NOT NULL DEFAULT (datetime('now')),
                    command TEXT,
                    telemetry TEXT,
                    impact_score FLOAT DEFAULT 1.0,
                    meta TEXT DEFAULT '{}'
                );
            """))
