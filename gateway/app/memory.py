from __future__ import annotations
import json
import uuid
from sqlalchemy import text
from .db import get_engine
from .embeddings import embed

def _as_id(val: str | None) -> str:
    return val or uuid.uuid4().hex

async def upsert(namespace: str, content: str, meta: dict | None = None, id: str | None = None, importance: float = 1.0) -> str:
    engine = get_engine()
    dialect = engine.dialect.name
    meta = meta or {}
    emb = (await embed([content]))[0]
    mem_id = _as_id(id)

    with engine.begin() as conn:
        if dialect == "postgresql":
            conn.execute(
                text("""
                    INSERT INTO omega_memory (id, namespace, content, meta, embedding, importance)
                    VALUES (:id, :ns, :content, CAST(:meta AS jsonb), :emb, :importance)
                    ON CONFLICT (id) DO UPDATE
                    SET namespace = EXCLUDED.namespace,
                        content = EXCLUDED.content,
                        meta = EXCLUDED.meta,
                        embedding = EXCLUDED.embedding,
                        importance = EXCLUDED.importance,
                        ts = NOW();
                """),
                {"id": mem_id, "ns": namespace, "content": content, "meta": json.dumps(meta), "emb": emb, "importance": importance},
            )
        else:
            # SQLite uses meta as TEXT and no casting
            conn.execute(
                text("""
                    INSERT INTO omega_memory (id, namespace, content, meta, embedding, importance)
                    VALUES (:id, :ns, :content, :meta, :emb, :importance)
                    ON CONFLICT (id) DO UPDATE
                    SET namespace = EXCLUDED.namespace,
                        content = EXCLUDED.content,
                        meta = EXCLUDED.meta,
                        embedding = EXCLUDED.embedding,
                        importance = EXCLUDED.importance,
                        ts = (datetime('now'));
                """),
                {"id": mem_id, "ns": namespace, "content": content, "meta": json.dumps(meta), "emb": json.dumps(emb), "importance": importance},
            )
    return mem_id

async def query(namespace: str, text_query: str, k: int = 8) -> list[dict]:
    engine = get_engine()
    dialect = engine.dialect.name
    q_emb = (await embed([text_query]))[0]

    with engine.begin() as conn:
        if dialect == "postgresql":
            rows = conn.execute(
                text("""
                    SELECT id, ts, content, meta, importance,
                           1 - (embedding <=> :q_emb) AS score
                    FROM omega_memory
                    WHERE namespace = :ns AND embedding IS NOT NULL
                    ORDER BY embedding <=> :q_emb
                    LIMIT :k;
                """),
                {"ns": namespace, "q_emb": q_emb, "k": k},
            ).mappings().all()
        else:
            # SQLite fallback: return by time descending
            rows = conn.execute(
                text("""
                    SELECT id, ts, content, meta, importance,
                           1.0 AS score
                    FROM omega_memory
                    WHERE namespace = :ns
                    ORDER BY ts DESC
                    LIMIT :k;
                """),
                {"ns": namespace, "k": k},
            ).mappings().all()

    return [dict(r) for r in rows]
