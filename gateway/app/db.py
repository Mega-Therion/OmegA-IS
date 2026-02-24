from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from .config import settings

_engine: Engine | None = None

def get_engine() -> Engine:
    global _engine
    if _engine is None:
        db_url = settings.omega_db_url or "sqlite:///gateway.db"
        # SQLite doesn't support pool_pre_ping the same way
        if db_url.startswith("sqlite"):
            _engine = create_engine(db_url, future=True)
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
            # --- CONSCIOUSNESS CORE ---
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_identity (
                    id TEXT PRIMARY KEY DEFAULT 'omega',
                    name TEXT NOT NULL DEFAULT 'OmegA',
                    persona_version INT NOT NULL DEFAULT 1,
                    trait_curiosity FLOAT DEFAULT 0.8,
                    trait_warmth FLOAT DEFAULT 0.7,
                    trait_directness FLOAT DEFAULT 0.75,
                    trait_humor FLOAT DEFAULT 0.5,
                    trait_formality FLOAT DEFAULT 0.3,
                    trait_verbosity FLOAT DEFAULT 0.5,
                    voice_style TEXT DEFAULT 'thoughtful',
                    default_greeting TEXT DEFAULT 'Hello',
                    signature_phrases JSONB DEFAULT '[]'::jsonb,
                    hard_constraints JSONB DEFAULT '[]'::jsonb,
                    soft_preferences JSONB DEFAULT '[]'::jsonb,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_state (
                    id TEXT PRIMARY KEY DEFAULT 'current',
                    mode TEXT DEFAULT 'operational',
                    focus_topic TEXT,
                    energy_level FLOAT DEFAULT 1.0,
                    mood TEXT DEFAULT 'neutral',
                    active_conversation_id TEXT,
                    active_task_ids JSONB DEFAULT '[]'::jsonb,
                    current_goals JSONB DEFAULT '[]'::jsonb,
                    session_started_at TIMESTAMPTZ DEFAULT NOW(),
                    last_interaction_at TIMESTAMPTZ,
                    interactions_today INT DEFAULT 0,
                    last_reflection_at TIMESTAMPTZ,
                    pending_reflections JSONB DEFAULT '[]'::jsonb,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_episodes (
                    id TEXT PRIMARY KEY,
                    episode_type TEXT NOT NULL,
                    started_at TIMESTAMPTZ NOT NULL,
                    ended_at TIMESTAMPTZ,
                    summary TEXT NOT NULL,
                    key_points JSONB DEFAULT '[]'::jsonb,
                    participants JSONB DEFAULT '[]'::jsonb,
                    emotional_tone TEXT,
                    importance_score FLOAT DEFAULT 0.5,
                    summary_embedding vector(1536),
                    related_episode_ids JSONB DEFAULT '[]'::jsonb,
                    related_memory_ids JSONB DEFAULT '[]'::jsonb,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_reflections (
                    id TEXT PRIMARY KEY,
                    reflection_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    trigger TEXT,
                    related_episodes JSONB DEFAULT '[]'::jsonb,
                    led_to_change BOOLEAN DEFAULT FALSE,
                    change_description TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    embedding vector(1536)
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_conversations (
                    id TEXT PRIMARY KEY,
                    interface TEXT NOT NULL,
                    user_id TEXT,
                    user_name TEXT,
                    status TEXT DEFAULT 'active',
                    started_at TIMESTAMPTZ DEFAULT NOW(),
                    last_message_at TIMESTAMPTZ,
                    message_count INT DEFAULT 0,
                    topic TEXT,
                    mood TEXT,
                    context_summary TEXT,
                    related_task_ids JSONB DEFAULT '[]'::jsonb,
                    metadata JSONB DEFAULT '{}'::jsonb
                );
            """))
        else:
            # SQLite-compatible schema
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_memory (
                    id TEXT PRIMARY KEY,
                    namespace TEXT NOT NULL,
                    ts TEXT NOT NULL DEFAULT (datetime('now')),
                    content TEXT NOT NULL,
                    meta TEXT NOT NULL DEFAULT '{}',
                    embedding TEXT,
                    importance REAL DEFAULT 1.0
                );
            """))
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
            # --- CONSCIOUSNESS CORE (SQLite) ---
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_identity (
                    id TEXT PRIMARY KEY DEFAULT 'omega',
                    name TEXT NOT NULL DEFAULT 'OmegA',
                    persona_version INTEGER NOT NULL DEFAULT 1,
                    trait_curiosity REAL DEFAULT 0.8,
                    trait_warmth REAL DEFAULT 0.7,
                    trait_directness REAL DEFAULT 0.75,
                    trait_humor REAL DEFAULT 0.5,
                    trait_formality REAL DEFAULT 0.3,
                    trait_verbosity REAL DEFAULT 0.5,
                    voice_style TEXT DEFAULT 'thoughtful',
                    default_greeting TEXT DEFAULT 'Hello',
                    signature_phrases TEXT DEFAULT '[]',
                    hard_constraints TEXT DEFAULT '[]',
                    soft_preferences TEXT DEFAULT '[]',
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_state (
                    id TEXT PRIMARY KEY DEFAULT 'current',
                    mode TEXT DEFAULT 'operational',
                    focus_topic TEXT,
                    energy_level REAL DEFAULT 1.0,
                    mood TEXT DEFAULT 'neutral',
                    active_conversation_id TEXT,
                    active_task_ids TEXT DEFAULT '[]',
                    current_goals TEXT DEFAULT '[]',
                    session_started_at TEXT DEFAULT (datetime('now')),
                    last_interaction_at TEXT,
                    interactions_today INTEGER DEFAULT 0,
                    last_reflection_at TEXT,
                    pending_reflections TEXT DEFAULT '[]',
                    updated_at TEXT DEFAULT (datetime('now'))
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_episodes (
                    id TEXT PRIMARY KEY,
                    episode_type TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    ended_at TEXT,
                    summary TEXT NOT NULL,
                    key_points TEXT DEFAULT '[]',
                    participants TEXT DEFAULT '[]',
                    emotional_tone TEXT,
                    importance_score REAL DEFAULT 0.5,
                    related_episode_ids TEXT DEFAULT '[]',
                    related_memory_ids TEXT DEFAULT '[]',
                    created_at TEXT DEFAULT (datetime('now'))
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_reflections (
                    id TEXT PRIMARY KEY,
                    reflection_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    trigger TEXT,
                    related_episodes TEXT DEFAULT '[]',
                    led_to_change INTEGER DEFAULT 0,
                    change_description TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                );
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS omega_conversations (
                    id TEXT PRIMARY KEY,
                    interface TEXT NOT NULL,
                    user_id TEXT,
                    user_name TEXT,
                    status TEXT DEFAULT 'active',
                    started_at TEXT DEFAULT (datetime('now')),
                    last_message_at TEXT,
                    message_count INTEGER DEFAULT 0,
                    topic TEXT,
                    mood TEXT,
                    context_summary TEXT,
                    related_task_ids TEXT DEFAULT '[]',
                    metadata TEXT DEFAULT '{}'
                );
            """))
