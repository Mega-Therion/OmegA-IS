from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "config" / "oryan.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def connect(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = Path(db_path) if db_path else DEFAULT_DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema_sql)
    conn.commit()
    _migrate_tasks_table(conn)


def _migrate_tasks_table(conn: sqlite3.Connection) -> None:
    cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
    if not cur.fetchone():
        return
    columns = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
    if "agent" in columns:
        return
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    legacy_name = f"tasks_legacy_{timestamp}"
    # Assumption: preserve legacy data for manual inspection instead of dropping it.
    conn.execute(f"ALTER TABLE tasks RENAME TO {legacy_name}")
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema_sql)
    conn.commit()


def create_task(conn: sqlite3.Connection, agent: str, prompt: str, now: str) -> int:
    cur = conn.execute(
        "INSERT INTO tasks (agent, prompt, status, created_at, updated_at) "
        "VALUES (?, ?, 'pending', ?, ?)",
        (agent, prompt, now, now),
    )
    conn.commit()
    return int(cur.lastrowid)


def list_tasks(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    cur = conn.execute("SELECT * FROM tasks ORDER BY id DESC")
    return cur.fetchall()


def get_task(conn: sqlite3.Connection, task_id: int) -> Optional[sqlite3.Row]:
    cur = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    return cur.fetchone()


def get_latest_task(conn: sqlite3.Connection, agent: Optional[str] = None) -> Optional[sqlite3.Row]:
    if agent:
        cur = conn.execute(
            "SELECT * FROM tasks WHERE agent = ? ORDER BY created_at DESC, id DESC LIMIT 1",
            (agent,),
        )
    else:
        cur = conn.execute("SELECT * FROM tasks ORDER BY created_at DESC, id DESC LIMIT 1")
    return cur.fetchone()


def update_task_status(conn: sqlite3.Connection, task_id: int, status: str, now: str) -> None:
    conn.execute(
        "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
        (status, now, task_id),
    )
    conn.commit()


def set_task_result(
    conn: sqlite3.Connection,
    task_id: int,
    output_path: str,
    error_path: str,
    status: str,
    now: str,
) -> None:
    conn.execute(
        "UPDATE tasks SET output_path = ?, error_path = ?, status = ?, updated_at = ? WHERE id = ?",
        (output_path, error_path, status, now, task_id),
    )
    conn.commit()
