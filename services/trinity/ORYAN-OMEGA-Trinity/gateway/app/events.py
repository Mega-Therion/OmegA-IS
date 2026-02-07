import json
import uuid
from sqlalchemy import text
from .db import get_engine


def append_event(event_type: str, payload: dict, actor: str = "gateway", prev_hash: str | None = None, hash_value: str | None = None) -> None:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO omega_events (id, actor, event_type, payload_json, prev_hash, hash, ts)
                VALUES (:id, :actor, :event_type, :payload_json, :prev_hash, :hash, NOW())
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "actor": actor,
                "event_type": event_type,
                "payload_json": json.dumps(payload),
                "prev_hash": prev_hash,
                "hash": hash_value,
            },
        )
