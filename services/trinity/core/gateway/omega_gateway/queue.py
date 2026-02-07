"""SQLite-backed durable inbox + idempotency store."""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "omega_gateway.sqlite"


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, ts TEXT, source TEXT, type TEXT, payload TEXT)"
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS idempotency (key TEXT PRIMARY KEY, event_id TEXT, ts TEXT)"
        )


def is_duplicate(idempotency_key: str) -> bool:
    if not idempotency_key:
        return False
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute("SELECT 1 FROM idempotency WHERE key = ?", (idempotency_key,))
        return cur.fetchone() is not None


def record_idempotency(idempotency_key: str, event_id: str, ts: str):
    if not idempotency_key:
        return
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO idempotency (key, event_id, ts) VALUES (?, ?, ?)",
            (idempotency_key, event_id, ts),
        )


def enqueue(event_id: str, ts: str, source: str, event_type: str, payload: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO events (id, ts, source, type, payload) VALUES (?, ?, ?, ?, ?)",
            (event_id, ts, source, event_type, payload),
        )
