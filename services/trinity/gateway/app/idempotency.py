from typing import Optional, Tuple
from sqlalchemy import text
from .db import get_engine


def get_cached_response(key: str) -> Optional[Tuple[int, bytes]]:
    engine = get_engine()
    with engine.begin() as conn:
        res = conn.execute(
            text("SELECT response_status, response_body FROM omega_idempotency WHERE key = :key"),
            {"key": key},
        ).first()
        if res:
            status, body = res
            return int(status), bytes(body or b"")
    return None


def store_response(key: str, status: int, body: bytes | None) -> None:
    engine = get_engine()
    dialect = engine.dialect.name
    ts_func = "NOW()" if dialect == "postgresql" else "datetime('now')"
    
    with engine.begin() as conn:
        conn.execute(
            text(
                f"""
                INSERT INTO omega_idempotency (key, response_status, response_body, created_at)
                VALUES (:key, :status, :body, {ts_func})
                ON CONFLICT (key) DO NOTHING
                """
            ),
            {"key": key, "status": int(status), "body": body or b""},
        )
