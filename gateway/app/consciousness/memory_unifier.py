"""
Memory Unifier for the Consciousness Core.

Unified interface to all memory systems (semantic, episodic, reflective).
"""

from __future__ import annotations
import logging
import json
from typing import List, Optional
from datetime import datetime
from sqlalchemy import text

from .schemas import (
    MemoryQuery, UnifiedMemoryHit, Episode, Reflection, Conversation
)
from ..db import get_engine
from ..embeddings import embed
from ..memory import query as query_semantic

logger = logging.getLogger("omega.consciousness.memory")


class MemoryUnifier:
    """
    Unified interface to all memory systems.

    Aggregates:
    - omega_memory (semantic facts)
    - omega_episodes (episodic experiences)
    - omega_reflections (self-observations)
    - omega_conversations (conversation context)
    """

    def __init__(self):
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize memory connections."""
        self._initialized = True
        logger.info("Memory Unifier initialized")

    async def query(self, query: MemoryQuery) -> List[UnifiedMemoryHit]:
        """
        Query all memory sources and return unified results.
        """
        results: List[UnifiedMemoryHit] = []

        # 1. Query semantic memory (omega_memory)
        if query.include_facts:
            try:
                semantic_hits = await query_semantic(
                    query.namespace,
                    query.query,
                    k=query.limit
                )
                for hit in semantic_hits:
                    results.append(UnifiedMemoryHit(
                        source="omega_memory",
                        id=hit.get("id", ""),
                        content=hit.get("content", ""),
                        score=hit.get("score", 0.0),
                        metadata=hit.get("meta", {}),
                    ))
            except Exception as e:
                logger.error(f"Semantic memory query failed: {e}")

        # 2. Query episodic memory
        if query.include_episodes:
            try:
                episode_hits = await self._query_episodes(query.query, query.limit)
                results.extend(episode_hits)
            except Exception as e:
                logger.error(f"Episodic memory query failed: {e}")

        # 3. Query reflections
        if query.include_reflections:
            try:
                reflection_hits = await self._query_reflections(query.query, query.limit // 2)
                results.extend(reflection_hits)
            except Exception as e:
                logger.error(f"Reflections query failed: {e}")

        # Sort by score
        results = sorted(results, key=lambda x: x.score, reverse=True)

        return results[:query.limit]

    async def _query_episodes(self, query_text: str, limit: int) -> List[UnifiedMemoryHit]:
        """Query episodic memory using vector similarity."""
        engine = get_engine()
        
        # Check if vector extension is available
        # If using SQLite, we might not have vector support here yet
        if "sqlite" in str(engine.url):
            return []

        try:
            query_embedding = (await embed([query_text]))[0]
            with engine.begin() as conn:
                rows = conn.execute(
                    text("""
                        SELECT id, summary, key_points, emotional_tone, importance_score,
                               1 - (summary_embedding <=> :emb) AS score
                        FROM omega_episodes
                        WHERE summary_embedding IS NOT NULL
                        ORDER BY summary_embedding <=> :emb
                        LIMIT :limit
                    """),
                    {"emb": query_embedding, "limit": limit}
                ).mappings().all()

            return [
                UnifiedMemoryHit(
                    source="omega_episodes",
                    id=row["id"],
                    content=row["summary"],
                    score=row["score"] * (1 + row["importance_score"]),
                    metadata={
                        "key_points": row["key_points"],
                        "emotional_tone": row["emotional_tone"],
                        "importance": row["importance_score"],
                    },
                )
                for row in rows
            ]
        except Exception as e:
            logger.warning(f"Failed episodic query: {e}")
            return []

    async def _query_reflections(self, query_text: str, limit: int) -> List[UnifiedMemoryHit]:
        """Query reflections using vector similarity."""
        engine = get_engine()
        
        if "sqlite" in str(engine.url):
            return []

        try:
            query_embedding = (await embed([query_text]))[0]
            with engine.begin() as conn:
                rows = conn.execute(
                    text("""
                        SELECT id, reflection_type, content, trigger,
                               1 - (embedding <=> :emb) AS score
                        FROM omega_reflections
                        WHERE embedding IS NOT NULL
                        ORDER BY embedding <=> :emb
                        LIMIT :limit
                    """),
                    {"emb": query_embedding, "limit": limit}
                ).mappings().all()

            return [
                UnifiedMemoryHit(
                    source="omega_reflections",
                    id=row["id"],
                    content=row["content"],
                    score=row["score"],
                    metadata={
                        "type": row["reflection_type"],
                        "trigger": row["trigger"],
                    },
                )
                for row in rows
            ]
        except Exception as e:
            logger.warning(f"Failed reflections query: {e}")
            return []

    async def save_conversation(self, conversation: Conversation) -> str:
        """Save or update a conversation."""
        engine = get_engine()

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO omega_conversations (
                        id, interface, user_id, user_name,
                        status, started_at, last_message_at, message_count,
                        topic, mood, context_summary,
                        related_task_ids, metadata
                    ) VALUES (
                        :id, :interface, :user_id, :user_name,
                        :status, :started, :last_msg, :count,
                        :topic, :mood, :summary,
                        :tasks, :meta
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        last_message_at = EXCLUDED.last_message_at,
                        message_count = EXCLUDED.message_count,
                        topic = EXCLUDED.topic,
                        mood = EXCLUDED.mood,
                        context_summary = EXCLUDED.context_summary,
                        related_task_ids = EXCLUDED.related_task_ids,
                        metadata = EXCLUDED.metadata
                """),
                {
                    "id": conversation.id,
                    "interface": conversation.interface,
                    "user_id": conversation.user_id,
                    "user_name": conversation.user_name,
                    "status": conversation.status,
                    "started": conversation.started_at,
                    "last_msg": conversation.last_message_at,
                    "count": conversation.message_count,
                    "topic": conversation.topic,
                    "mood": conversation.mood,
                    "summary": conversation.context_summary,
                    "tasks": json.dumps(conversation.related_task_ids),
                    "meta": json.dumps(conversation.metadata),
                }
            )

        return conversation.id

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get a conversation by ID."""
        engine = get_engine()

        with engine.begin() as conn:
            row = conn.execute(
                text("SELECT * FROM omega_conversations WHERE id = :id"),
                {"id": conversation_id}
            ).mappings().first()

        if row:
            def parse_json(val):
                if isinstance(val, str):
                    try:
                        return json.loads(val)
                    except:
                        return []
                return val or []

            return Conversation(
                id=row["id"],
                interface=row["interface"],
                user_id=row["user_id"],
                user_name=row["user_name"],
                status=row["status"],
                started_at=row["started_at"],
                last_message_at=row["last_message_at"],
                message_count=row["message_count"] or 0,
                topic=row["topic"],
                mood=row["mood"],
                context_summary=row["context_summary"],
                related_task_ids=parse_json(row["related_task_ids"]),
                metadata=parse_json(row["metadata"]),
            )
        return None

    async def save_reflection(self, reflection: Reflection) -> str:
        """Save a reflection to memory."""
        engine = get_engine()

        embedding = None
        if "sqlite" not in str(engine.url):
            try:
                embedding = (await embed([reflection.content]))[0]
            except: pass

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO omega_reflections (
                        id, reflection_type, content, trigger,
                        related_episodes, led_to_change, change_description,
                        embedding, created_at
                    ) VALUES (
                        :id, :type, :content, :trigger,
                        :episodes, :changed, :change_desc,
                        :embedding, datetime('now')
                    )
                """),
                {
                    "id": reflection.id,
                    "type": reflection.reflection_type.value,
                    "content": reflection.content,
                    "trigger": reflection.trigger,
                    "episodes": json.dumps(reflection.related_episodes),
                    "changed": reflection.led_to_change,
                    "change_desc": reflection.change_description,
                    "embedding": embedding,
                }
            )

        return reflection.id
