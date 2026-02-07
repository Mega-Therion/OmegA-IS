from __future__ import annotations
import json
import uuid
from sqlalchemy import text
from .db import get_engine
from .embeddings import embed

def _as_id(val: str | None) -> str:
    return val or uuid.uuid4().hex

async def upsert(namespace: str, content: str, meta: dict | None = None, id: str | None = None) -> str:
    engine = get_engine()
    meta = meta or {}
    emb = (await embed([content]))[0]

    mem_id = _as_id(id)
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO omega_memory (id, namespace, content, meta, embedding)
                VALUES (:id, :ns, :content, CAST(:meta AS jsonb), :emb)
                ON CONFLICT (id) DO UPDATE
                SET namespace = EXCLUDED.namespace,
                    content = EXCLUDED.content,
                    meta = EXCLUDED.meta,
                    embedding = EXCLUDED.embedding,
                    ts = NOW();
            """),
            {"id": mem_id, "ns": namespace, "content": content, "meta": json.dumps(meta), "emb": emb},
        )
    return mem_id

async def query(namespace: str, text_query: str, k: int = 8) -> list[dict]:
    engine = get_engine()
    q_emb = (await embed([text_query]))[0]

    with engine.begin() as conn:
        rows = conn.execute(
            text("""
                SELECT id, ts, content, meta,
                       1 - (embedding <=> :q_emb) AS score
                FROM omega_memory
                WHERE namespace = :ns AND embedding IS NOT NULL
                ORDER BY embedding <=> :q_emb
                LIMIT :k;
            """),
            {"ns": namespace, "q_emb": q_emb, "k": k},
        ).mappings().all()

    return [dict(r) for r in rows]
