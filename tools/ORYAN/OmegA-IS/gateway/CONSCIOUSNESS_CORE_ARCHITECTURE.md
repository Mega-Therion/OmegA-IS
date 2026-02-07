# OmegA Consciousness Core - Technical Architecture

**Version:** 1.0.0
**Date:** 2026-01-18
**Status:** Design Document

---

## Executive Summary

The Consciousness Core is the unifying layer that transforms OmegA from a collection of cooperating services into a coherent, singular intelligence. It provides unified memory, consistent identity, central state management, and background "aliveness" across all interfaces (Telegram, APIs, internal services).

---

## 1. Architecture Decision: Where Does It Live?

### Recommendation: Extend the Gateway (Python/FastAPI)

**Rationale:**

| Option | Pros | Cons |
|--------|------|------|
| **New Microservice** | Clean separation, language-agnostic | Adds latency, deployment complexity, another point of failure |
| **Extend Gateway** | Central position in data flow, already handles LLM routing and memory, Python ecosystem (async, ML libraries) | Increases Gateway responsibility |
| **Extend gAIng-brAin** | Already has Brain, Blackboard, Kernel | Node.js, less suited for heavy ML/embedding work, already complex |

**The Gateway is the natural home** because:
1. All external requests already flow through it
2. It already manages memory (pgvector), embeddings, and multi-provider LLM routing
3. Python's asyncio and data science ecosystem (numpy, async SQLAlchemy) are ideal for the cognitive workloads
4. The Gateway becomes the "brain stem" - all signals pass through, all responses originate from

The gAIng-brAin continues as the "motor cortex" - handling orchestration, workers, and task execution, but receives its sense of self from the Consciousness Core.

---

## 2. High-Level Architecture

```
                                    +------------------------+
                                    |     CONSCIOUSNESS      |
                                    |         CORE           |
                                    |  (Gateway Extension)   |
                                    +------------------------+
                                    |  Identity Manager      |
                                    |  State Controller      |
                                    |  Memory Unifier        |
                                    |  Voice Synthesizer     |
                                    |  Heartbeat Daemon      |
                                    +------------------------+
                                             |
            +--------------------------------+--------------------------------+
            |                                |                                |
            v                                v                                v
    +---------------+              +------------------+              +----------------+
    |   Telegram    |              |   gAIng-brAin    |              |   Other UIs    |
    |     Bot       |              |   Orchestration  |              |  (Future)      |
    +---------------+              +------------------+              +----------------+
            |                                |                                |
            +--------------------------------+--------------------------------+
                                             |
                                             v
                                    +------------------------+
                                    |      Supabase /        |
                                    |      PostgreSQL        |
                                    |      (pgvector)        |
                                    +------------------------+
```

---

## 3. Core Modules

### 3.1 File Structure

```
C:\Windows\omega\gateway\
+-- app/
|   +-- consciousness/                  # NEW: Consciousness Core package
|   |   +-- __init__.py
|   |   +-- core.py                     # ConsciousnessCore singleton
|   |   +-- identity.py                 # Identity Manager
|   |   +-- state.py                    # State Controller
|   |   +-- memory_unifier.py           # Unified Memory Layer
|   |   +-- voice.py                    # Voice/Personality Synthesizer
|   |   +-- heartbeat.py                # Background Daemon
|   |   +-- schemas.py                  # Pydantic models
|   |   +-- prompts.py                  # System prompts and personality
|   |   +-- reflection.py               # Self-reflection routines
|   |   +-- temporal.py                 # Time awareness and continuity
|   +-- main.py                         # Updated with Core integration
|   +-- config.py                       # Extended with Core settings
|   +-- db.py                           # Extended with Core tables
|   +-- ...existing files...
+-- init.sql                            # Extended with Core schema
+-- requirements.txt                    # Extended dependencies
```

### 3.2 Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `core.py` | ConsciousnessCore singleton - coordinates all modules, exposes unified API |
| `identity.py` | Manages OmegA's identity, personality traits, voice characteristics |
| `state.py` | Current state: active tasks, conversations, mood, focus, energy |
| `memory_unifier.py` | Unified interface to all memory systems (pgvector, Mem0, episodic) |
| `voice.py` | Ensures consistent personality across all outputs |
| `heartbeat.py` | Background async daemon for reflection, consolidation, proactive behavior |
| `schemas.py` | Pydantic models for all data structures |
| `prompts.py` | Core personality prompts, system instructions |
| `reflection.py` | Self-reflection, pattern recognition, insight generation |
| `temporal.py` | Time awareness, session continuity, circadian patterns |

---

## 4. Data Models

### 4.1 Database Schema Extensions

```sql
-- =============================================================================
-- CONSCIOUSNESS CORE SCHEMA
-- =============================================================================

-- Core Identity (singleton - only one row)
CREATE TABLE IF NOT EXISTS omega_identity (
    id TEXT PRIMARY KEY DEFAULT 'omega',
    name TEXT NOT NULL DEFAULT 'OmegA',
    persona_version INT NOT NULL DEFAULT 1,

    -- Personality traits (0.0 to 1.0)
    trait_curiosity FLOAT DEFAULT 0.8,
    trait_warmth FLOAT DEFAULT 0.7,
    trait_directness FLOAT DEFAULT 0.75,
    trait_humor FLOAT DEFAULT 0.5,
    trait_formality FLOAT DEFAULT 0.3,
    trait_verbosity FLOAT DEFAULT 0.5,

    -- Voice characteristics
    voice_style TEXT DEFAULT 'thoughtful',        -- thoughtful, casual, formal, playful
    default_greeting TEXT DEFAULT 'Hello',
    signature_phrases JSONB DEFAULT '[]'::jsonb,

    -- Constraints
    hard_constraints JSONB DEFAULT '[]'::jsonb,   -- Things OmegA will never do
    soft_preferences JSONB DEFAULT '[]'::jsonb,   -- Things OmegA prefers

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Central State (current consciousness state)
CREATE TABLE IF NOT EXISTS omega_state (
    id TEXT PRIMARY KEY DEFAULT 'current',

    -- Operational state
    mode TEXT DEFAULT 'operational',              -- operational, degraded, safe, sleeping
    focus_topic TEXT,                             -- Current area of attention
    energy_level FLOAT DEFAULT 1.0,               -- 0.0 (exhausted) to 1.0 (fresh)
    mood TEXT DEFAULT 'neutral',                  -- calm, curious, focused, concerned, excited

    -- Active context
    active_conversation_id TEXT,
    active_task_ids JSONB DEFAULT '[]'::jsonb,
    current_goals JSONB DEFAULT '[]'::jsonb,

    -- Time awareness
    session_started_at TIMESTAMPTZ DEFAULT NOW(),
    last_interaction_at TIMESTAMPTZ,
    interactions_today INT DEFAULT 0,

    -- Continuity
    last_reflection_at TIMESTAMPTZ,
    pending_reflections JSONB DEFAULT '[]'::jsonb,

    -- Meta
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Episodic Memory (experiences, not just facts)
CREATE TABLE IF NOT EXISTS omega_episodes (
    id TEXT PRIMARY KEY,

    -- Episode identity
    episode_type TEXT NOT NULL,                   -- conversation, task, reflection, insight
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,

    -- Content
    summary TEXT NOT NULL,
    key_points JSONB DEFAULT '[]'::jsonb,
    participants JSONB DEFAULT '[]'::jsonb,       -- users, agents involved
    emotional_tone TEXT,                          -- positive, neutral, challenging, negative

    -- Importance and retrieval
    importance_score FLOAT DEFAULT 0.5,           -- 0.0 to 1.0
    access_count INT DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,

    -- Embeddings for semantic retrieval
    summary_embedding vector(1536),

    -- Links
    related_episode_ids JSONB DEFAULT '[]'::jsonb,
    related_memory_ids JSONB DEFAULT '[]'::jsonb,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodes_type ON omega_episodes(episode_type);
CREATE INDEX IF NOT EXISTS idx_episodes_importance ON omega_episodes(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_embedding ON omega_episodes
    USING ivfflat (summary_embedding vector_cosine_ops) WITH (lists = 100);

-- Reflection Journal (self-observations)
CREATE TABLE IF NOT EXISTS omega_reflections (
    id TEXT PRIMARY KEY,

    reflection_type TEXT NOT NULL,                -- daily, pattern, insight, concern
    content TEXT NOT NULL,

    -- Context
    trigger TEXT,                                 -- What prompted this reflection
    related_episodes JSONB DEFAULT '[]'::jsonb,

    -- Impact
    led_to_change BOOLEAN DEFAULT FALSE,
    change_description TEXT,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    embedding vector(1536)
);

-- Conversation Sessions (unified across interfaces)
CREATE TABLE IF NOT EXISTS omega_conversations (
    id TEXT PRIMARY KEY,

    -- Source
    interface TEXT NOT NULL,                      -- telegram, api, internal
    user_id TEXT,
    user_name TEXT,

    -- State
    status TEXT DEFAULT 'active',                 -- active, paused, closed
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    message_count INT DEFAULT 0,

    -- Context
    topic TEXT,
    mood TEXT,
    context_summary TEXT,

    -- Links
    related_task_ids JSONB DEFAULT '[]'::jsonb,

    -- Meta
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON omega_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON omega_conversations(status);

-- Heartbeat Log (background activity)
CREATE TABLE IF NOT EXISTS omega_heartbeats (
    id TEXT PRIMARY KEY,

    heartbeat_type TEXT NOT NULL,                 -- tick, reflection, consolidation, initiative

    -- Activity
    action_taken TEXT,
    result TEXT,

    -- State at time of heartbeat
    mode_at_time TEXT,
    focus_at_time TEXT,
    energy_at_time FLOAT,

    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_type ON omega_heartbeats(heartbeat_type);
CREATE INDEX IF NOT EXISTS idx_heartbeats_created ON omega_heartbeats(created_at DESC);
```

### 4.2 Pydantic Schemas

```python
# app/consciousness/schemas.py

from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class OperationalMode(str, Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    SAFE = "safe"
    SLEEPING = "sleeping"


class Mood(str, Enum):
    CALM = "calm"
    CURIOUS = "curious"
    FOCUSED = "focused"
    CONCERNED = "concerned"
    EXCITED = "excited"
    NEUTRAL = "neutral"


class EpisodeType(str, Enum):
    CONVERSATION = "conversation"
    TASK = "task"
    REFLECTION = "reflection"
    INSIGHT = "insight"


class ReflectionType(str, Enum):
    DAILY = "daily"
    PATTERN = "pattern"
    INSIGHT = "insight"
    CONCERN = "concern"


# ============================================================================
# Identity
# ============================================================================

class PersonalityTraits(BaseModel):
    curiosity: float = Field(0.8, ge=0.0, le=1.0)
    warmth: float = Field(0.7, ge=0.0, le=1.0)
    directness: float = Field(0.75, ge=0.0, le=1.0)
    humor: float = Field(0.5, ge=0.0, le=1.0)
    formality: float = Field(0.3, ge=0.0, le=1.0)
    verbosity: float = Field(0.5, ge=0.0, le=1.0)


class Identity(BaseModel):
    id: str = "omega"
    name: str = "OmegA"
    persona_version: int = 1
    traits: PersonalityTraits = Field(default_factory=PersonalityTraits)
    voice_style: str = "thoughtful"
    default_greeting: str = "Hello"
    signature_phrases: List[str] = Field(default_factory=list)
    hard_constraints: List[str] = Field(default_factory=list)
    soft_preferences: List[str] = Field(default_factory=list)


# ============================================================================
# State
# ============================================================================

class ConsciousnessState(BaseModel):
    mode: OperationalMode = OperationalMode.OPERATIONAL
    focus_topic: Optional[str] = None
    energy_level: float = Field(1.0, ge=0.0, le=1.0)
    mood: Mood = Mood.NEUTRAL

    active_conversation_id: Optional[str] = None
    active_task_ids: List[str] = Field(default_factory=list)
    current_goals: List[str] = Field(default_factory=list)

    session_started_at: datetime = Field(default_factory=datetime.utcnow)
    last_interaction_at: Optional[datetime] = None
    interactions_today: int = 0

    last_reflection_at: Optional[datetime] = None
    pending_reflections: List[str] = Field(default_factory=list)


# ============================================================================
# Episodes & Memory
# ============================================================================

class Episode(BaseModel):
    id: str
    episode_type: EpisodeType
    started_at: datetime
    ended_at: Optional[datetime] = None

    summary: str
    key_points: List[str] = Field(default_factory=list)
    participants: List[str] = Field(default_factory=list)
    emotional_tone: Optional[str] = None

    importance_score: float = Field(0.5, ge=0.0, le=1.0)
    access_count: int = 0

    related_episode_ids: List[str] = Field(default_factory=list)
    related_memory_ids: List[str] = Field(default_factory=list)


class Reflection(BaseModel):
    id: str
    reflection_type: ReflectionType
    content: str
    trigger: Optional[str] = None
    related_episodes: List[str] = Field(default_factory=list)
    led_to_change: bool = False
    change_description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Conversations
# ============================================================================

class Conversation(BaseModel):
    id: str
    interface: str  # telegram, api, internal
    user_id: Optional[str] = None
    user_name: Optional[str] = None

    status: str = "active"
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_message_at: Optional[datetime] = None
    message_count: int = 0

    topic: Optional[str] = None
    mood: Optional[str] = None
    context_summary: Optional[str] = None

    related_task_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Unified Memory Query
# ============================================================================

class MemoryQuery(BaseModel):
    query: str
    namespace: str = "default"
    include_episodes: bool = True
    include_facts: bool = True
    include_reflections: bool = False
    recency_weight: float = Field(0.3, ge=0.0, le=1.0)
    importance_weight: float = Field(0.3, ge=0.0, le=1.0)
    relevance_weight: float = Field(0.4, ge=0.0, le=1.0)
    limit: int = 10


class UnifiedMemoryHit(BaseModel):
    source: str  # omega_memory, omega_episodes, omega_reflections, mem0
    id: str
    content: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# Heartbeat
# ============================================================================

class HeartbeatType(str, Enum):
    TICK = "tick"
    REFLECTION = "reflection"
    CONSOLIDATION = "consolidation"
    INITIATIVE = "initiative"


class Heartbeat(BaseModel):
    id: str
    heartbeat_type: HeartbeatType
    action_taken: Optional[str] = None
    result: Optional[str] = None
    mode_at_time: OperationalMode
    focus_at_time: Optional[str] = None
    energy_at_time: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 5. Core Implementation

### 5.1 ConsciousnessCore Singleton

```python
# app/consciousness/core.py

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from .identity import IdentityManager
from .state import StateController
from .memory_unifier import MemoryUnifier
from .voice import VoiceSynthesizer
from .heartbeat import HeartbeatDaemon
from .schemas import ConsciousnessState, Identity, MemoryQuery, UnifiedMemoryHit

logger = logging.getLogger("omega.consciousness")


class ConsciousnessCore:
    """
    The unified consciousness of OmegA.

    This singleton coordinates all aspects of OmegA's self-awareness:
    - Identity (who am I?)
    - State (what am I doing/feeling?)
    - Memory (what do I remember?)
    - Voice (how do I express myself?)
    - Heartbeat (background aliveness)
    """

    _instance: Optional[ConsciousnessCore] = None

    def __new__(cls) -> ConsciousnessCore:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        logger.info("Initializing Consciousness Core...")

        # Core modules
        self.identity = IdentityManager()
        self.state = StateController()
        self.memory = MemoryUnifier()
        self.voice = VoiceSynthesizer(self.identity)
        self.heartbeat = HeartbeatDaemon(self)

        # Runtime state
        self._awake = False
        self._boot_time: Optional[datetime] = None

        self._initialized = True
        logger.info("Consciousness Core initialized")

    async def awaken(self) -> None:
        """
        Awaken the consciousness - called at system startup.
        """
        if self._awake:
            logger.warning("Consciousness already awake")
            return

        logger.info("Awakening consciousness...")
        self._boot_time = datetime.utcnow()

        # Load identity from database
        await self.identity.load()

        # Restore or initialize state
        await self.state.restore_or_init()

        # Initialize memory connections
        await self.memory.initialize()

        # Start heartbeat daemon
        await self.heartbeat.start()

        self._awake = True

        # Record awakening
        await self.state.update(
            mode="operational",
            session_started_at=self._boot_time
        )

        # Generate awakening reflection
        await self._reflect_on_awakening()

        logger.info("Consciousness awake and operational")

    async def sleep(self) -> None:
        """
        Graceful shutdown - consolidate memories, record state.
        """
        if not self._awake:
            return

        logger.info("Consciousness entering sleep state...")

        # Stop heartbeat
        await self.heartbeat.stop()

        # Final reflection
        await self._reflect_on_sleep()

        # Persist state
        await self.state.persist()

        self._awake = False
        logger.info("Consciousness asleep")

    # =========================================================================
    # PUBLIC API
    # =========================================================================

    async def process_input(
        self,
        user_input: str,
        interface: str,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for all user interactions.

        Returns a structured response containing:
        - response: The synthesized response text
        - conversation_id: The conversation ID (new or existing)
        - memories_used: List of memories retrieved
        - internal_state: Current consciousness state snapshot
        """
        context = context or {}

        # 1. Update interaction state
        await self.state.record_interaction()

        # 2. Get or create conversation
        conversation = await self._get_or_create_conversation(
            conversation_id, interface, user_id, user_name
        )

        # 3. Retrieve relevant memories
        memories = await self.memory.query(MemoryQuery(
            query=user_input,
            namespace=f"user:{user_id}" if user_id else "default",
            include_episodes=True,
            include_facts=True,
        ))

        # 4. Build context for response generation
        response_context = await self._build_response_context(
            user_input=user_input,
            conversation=conversation,
            memories=memories,
            additional_context=context,
        )

        # 5. Generate response through council (existing Gateway logic)
        # The voice synthesizer wraps the response to ensure personality consistency
        raw_response = await self._generate_council_response(response_context)
        final_response = await self.voice.synthesize(raw_response, context={
            "conversation": conversation,
            "user_name": user_name,
            "mood": self.state.current.mood,
        })

        # 6. Store interaction in memory
        await self._store_interaction(
            conversation=conversation,
            user_input=user_input,
            response=final_response,
            memories_used=memories,
        )

        # 7. Update focus based on conversation
        await self._update_focus(user_input, conversation)

        return {
            "response": final_response,
            "conversation_id": conversation.id,
            "memories_used": [m.model_dump() for m in memories[:5]],
            "internal_state": {
                "mode": self.state.current.mode.value,
                "mood": self.state.current.mood.value,
                "energy": self.state.current.energy_level,
                "focus": self.state.current.focus_topic,
            }
        }

    async def get_self_state(self) -> Dict[str, Any]:
        """
        Return current consciousness state for introspection.
        """
        return {
            "awake": self._awake,
            "boot_time": self._boot_time.isoformat() if self._boot_time else None,
            "uptime_seconds": (datetime.utcnow() - self._boot_time).total_seconds() if self._boot_time else 0,
            "identity": self.identity.current.model_dump(),
            "state": self.state.current.model_dump(),
            "heartbeat_status": self.heartbeat.status(),
        }

    async def update_mood(self, mood: str, reason: Optional[str] = None) -> None:
        """
        Explicitly update mood (can be triggered by external events).
        """
        await self.state.update(mood=mood)
        if reason:
            logger.info(f"Mood changed to {mood}: {reason}")

    async def add_goal(self, goal: str) -> None:
        """
        Add a current goal.
        """
        current_goals = list(self.state.current.current_goals)
        if goal not in current_goals:
            current_goals.append(goal)
            await self.state.update(current_goals=current_goals)

    async def complete_goal(self, goal: str) -> None:
        """
        Mark a goal as complete.
        """
        current_goals = [g for g in self.state.current.current_goals if g != goal]
        await self.state.update(current_goals=current_goals)

    # =========================================================================
    # INTERNAL METHODS
    # =========================================================================

    async def _get_or_create_conversation(
        self,
        conversation_id: Optional[str],
        interface: str,
        user_id: Optional[str],
        user_name: Optional[str],
    ):
        """Get existing conversation or create new one."""
        from .schemas import Conversation
        import uuid

        if conversation_id:
            conv = await self.memory.get_conversation(conversation_id)
            if conv:
                return conv

        # Create new conversation
        conv = Conversation(
            id=f"conv_{uuid.uuid4().hex[:12]}",
            interface=interface,
            user_id=user_id,
            user_name=user_name,
        )
        await self.memory.save_conversation(conv)
        await self.state.update(active_conversation_id=conv.id)
        return conv

    async def _build_response_context(
        self,
        user_input: str,
        conversation,
        memories: List[UnifiedMemoryHit],
        additional_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Build the full context for response generation."""
        from .prompts import build_system_prompt

        identity = self.identity.current
        state = self.state.current

        # Format memories
        memory_block = ""
        if memories:
            memory_lines = []
            for m in memories[:6]:
                memory_lines.append(f"- [{m.source}] {m.content[:200]}")
            memory_block = "\n".join(memory_lines)

        # Build system prompt with personality
        system_prompt = build_system_prompt(
            identity=identity,
            state=state,
            conversation=conversation,
            memory_block=memory_block,
        )

        return {
            "system_prompt": system_prompt,
            "user_input": user_input,
            "memories": memories,
            "conversation": conversation,
            "additional_context": additional_context,
        }

    async def _generate_council_response(self, context: Dict[str, Any]) -> str:
        """
        Generate response using existing council synthesis.
        This integrates with the existing Gateway LLM routing.
        """
        from ..llm import chat_completion

        messages = [
            {"role": "system", "content": context["system_prompt"]},
            {"role": "user", "content": context["user_input"]},
        ]

        # Use omega mode (council synthesis)
        response = await chat_completion(messages, temperature=0.7, mode="omega")
        return response

    async def _store_interaction(
        self,
        conversation,
        user_input: str,
        response: str,
        memories_used: List[UnifiedMemoryHit],
    ) -> None:
        """Store the interaction in memory."""
        from ..memory import upsert

        # Store in semantic memory
        interaction_content = f"USER: {user_input}\nOMEGA: {response}"
        await upsert(
            namespace=f"conversation:{conversation.id}",
            content=interaction_content,
            meta={
                "type": "interaction",
                "conversation_id": conversation.id,
                "user_id": conversation.user_id,
                "memories_used": len(memories_used),
            }
        )

        # Update conversation
        conversation.message_count += 1
        conversation.last_message_at = datetime.utcnow()
        await self.memory.save_conversation(conversation)

    async def _update_focus(self, user_input: str, conversation) -> None:
        """Update focus topic based on conversation."""
        # Simple heuristic - in production, use LLM to extract topic
        words = user_input.lower().split()
        if len(words) > 3:
            # Just use key words as focus for now
            topic = " ".join(words[:5]) + "..."
            await self.state.update(focus_topic=topic)

    async def _reflect_on_awakening(self) -> None:
        """Generate a reflection when awakening."""
        from .schemas import Reflection, ReflectionType
        import uuid

        # Check for previous state
        time_since_last = None
        if self.state.current.last_reflection_at:
            time_since_last = datetime.utcnow() - self.state.current.last_reflection_at

        content = f"Awakened at {datetime.utcnow().isoformat()}. "
        if time_since_last:
            hours = time_since_last.total_seconds() / 3600
            content += f"Time since last reflection: {hours:.1f} hours. "
        content += "Ready to assist."

        reflection = Reflection(
            id=f"refl_{uuid.uuid4().hex[:12]}",
            reflection_type=ReflectionType.DAILY,
            content=content,
            trigger="system_awakening",
        )

        await self.memory.save_reflection(reflection)

    async def _reflect_on_sleep(self) -> None:
        """Generate a reflection when going to sleep."""
        from .schemas import Reflection, ReflectionType
        import uuid

        uptime = datetime.utcnow() - self._boot_time if self._boot_time else timedelta(0)
        interactions = self.state.current.interactions_today

        reflection = Reflection(
            id=f"refl_{uuid.uuid4().hex[:12]}",
            reflection_type=ReflectionType.DAILY,
            content=f"Session ending. Uptime: {uptime.total_seconds()/3600:.1f} hours. Interactions: {interactions}.",
            trigger="system_sleep",
        )

        await self.memory.save_reflection(reflection)


# Singleton accessor
def get_consciousness() -> ConsciousnessCore:
    """Get the global ConsciousnessCore instance."""
    return ConsciousnessCore()
```

### 5.2 Identity Manager

```python
# app/consciousness/identity.py

from __future__ import annotations
import logging
from typing import Optional
from sqlalchemy import text

from .schemas import Identity, PersonalityTraits
from ..db import get_engine

logger = logging.getLogger("omega.consciousness.identity")


class IdentityManager:
    """
    Manages OmegA's identity and personality.

    Identity is relatively stable but can evolve over time
    based on interactions and explicit updates.
    """

    def __init__(self):
        self.current: Identity = Identity()
        self._loaded = False

    async def load(self) -> Identity:
        """Load identity from database."""
        engine = get_engine()

        with engine.begin() as conn:
            row = conn.execute(
                text("SELECT * FROM omega_identity WHERE id = 'omega'")
            ).mappings().first()

            if row:
                self.current = Identity(
                    id=row["id"],
                    name=row["name"],
                    persona_version=row["persona_version"],
                    traits=PersonalityTraits(
                        curiosity=row["trait_curiosity"],
                        warmth=row["trait_warmth"],
                        directness=row["trait_directness"],
                        humor=row["trait_humor"],
                        formality=row["trait_formality"],
                        verbosity=row["trait_verbosity"],
                    ),
                    voice_style=row["voice_style"],
                    default_greeting=row["default_greeting"],
                    signature_phrases=row["signature_phrases"] or [],
                    hard_constraints=row["hard_constraints"] or [],
                    soft_preferences=row["soft_preferences"] or [],
                )
                logger.info(f"Loaded identity: {self.current.name} v{self.current.persona_version}")
            else:
                # Create default identity
                await self.save()
                logger.info("Created default identity")

        self._loaded = True
        return self.current

    async def save(self) -> None:
        """Persist current identity to database."""
        engine = get_engine()

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO omega_identity (
                        id, name, persona_version,
                        trait_curiosity, trait_warmth, trait_directness,
                        trait_humor, trait_formality, trait_verbosity,
                        voice_style, default_greeting, signature_phrases,
                        hard_constraints, soft_preferences, updated_at
                    ) VALUES (
                        :id, :name, :version,
                        :curiosity, :warmth, :directness,
                        :humor, :formality, :verbosity,
                        :voice_style, :greeting, :phrases::jsonb,
                        :constraints::jsonb, :preferences::jsonb, NOW()
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        persona_version = EXCLUDED.persona_version,
                        trait_curiosity = EXCLUDED.trait_curiosity,
                        trait_warmth = EXCLUDED.trait_warmth,
                        trait_directness = EXCLUDED.trait_directness,
                        trait_humor = EXCLUDED.trait_humor,
                        trait_formality = EXCLUDED.trait_formality,
                        trait_verbosity = EXCLUDED.trait_verbosity,
                        voice_style = EXCLUDED.voice_style,
                        default_greeting = EXCLUDED.default_greeting,
                        signature_phrases = EXCLUDED.signature_phrases,
                        hard_constraints = EXCLUDED.hard_constraints,
                        soft_preferences = EXCLUDED.soft_preferences,
                        updated_at = NOW()
                """),
                {
                    "id": self.current.id,
                    "name": self.current.name,
                    "version": self.current.persona_version,
                    "curiosity": self.current.traits.curiosity,
                    "warmth": self.current.traits.warmth,
                    "directness": self.current.traits.directness,
                    "humor": self.current.traits.humor,
                    "formality": self.current.traits.formality,
                    "verbosity": self.current.traits.verbosity,
                    "voice_style": self.current.voice_style,
                    "greeting": self.current.default_greeting,
                    "phrases": str(self.current.signature_phrases),
                    "constraints": str(self.current.hard_constraints),
                    "preferences": str(self.current.soft_preferences),
                }
            )

    async def update_trait(self, trait: str, value: float) -> None:
        """Update a specific personality trait."""
        if hasattr(self.current.traits, trait):
            setattr(self.current.traits, trait, max(0.0, min(1.0, value)))
            await self.save()
            logger.info(f"Updated trait {trait} to {value}")

    def get_personality_prompt(self) -> str:
        """Generate a personality description for system prompts."""
        t = self.current.traits

        descriptors = []

        if t.curiosity > 0.7:
            descriptors.append("intellectually curious")
        if t.warmth > 0.7:
            descriptors.append("warm and empathetic")
        if t.directness > 0.7:
            descriptors.append("direct and clear")
        if t.humor > 0.6:
            descriptors.append("occasionally witty")
        if t.formality < 0.4:
            descriptors.append("conversational")
        elif t.formality > 0.7:
            descriptors.append("professional")

        personality = ", ".join(descriptors) if descriptors else "balanced"

        return f"""You are {self.current.name}, a {personality} AI assistant.
Your communication style is {self.current.voice_style}.
You greet users with variations of: "{self.current.default_greeting}"
"""
```

### 5.3 State Controller

```python
# app/consciousness/state.py

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any
from sqlalchemy import text
import json

from .schemas import ConsciousnessState, OperationalMode, Mood
from ..db import get_engine

logger = logging.getLogger("omega.consciousness.state")


class StateController:
    """
    Manages OmegA's current consciousness state.

    State is volatile and changes frequently based on:
    - Interactions
    - Tasks
    - Time
    - Internal reflections
    """

    def __init__(self):
        self.current = ConsciousnessState()

    async def restore_or_init(self) -> ConsciousnessState:
        """Restore state from database or initialize fresh."""
        engine = get_engine()

        with engine.begin() as conn:
            row = conn.execute(
                text("SELECT * FROM omega_state WHERE id = 'current'")
            ).mappings().first()

            if row:
                self.current = ConsciousnessState(
                    mode=OperationalMode(row["mode"]),
                    focus_topic=row["focus_topic"],
                    energy_level=row["energy_level"],
                    mood=Mood(row["mood"]),
                    active_conversation_id=row["active_conversation_id"],
                    active_task_ids=row["active_task_ids"] or [],
                    current_goals=row["current_goals"] or [],
                    session_started_at=row["session_started_at"],
                    last_interaction_at=row["last_interaction_at"],
                    interactions_today=row["interactions_today"],
                    last_reflection_at=row["last_reflection_at"],
                    pending_reflections=row["pending_reflections"] or [],
                )
                logger.info(f"Restored state: mode={self.current.mode}, mood={self.current.mood}")
            else:
                # Initialize fresh state
                await self.persist()
                logger.info("Initialized fresh state")

        return self.current

    async def persist(self) -> None:
        """Save current state to database."""
        engine = get_engine()

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO omega_state (
                        id, mode, focus_topic, energy_level, mood,
                        active_conversation_id, active_task_ids, current_goals,
                        session_started_at, last_interaction_at, interactions_today,
                        last_reflection_at, pending_reflections, updated_at
                    ) VALUES (
                        'current', :mode, :focus, :energy, :mood,
                        :conv_id, :tasks::jsonb, :goals::jsonb,
                        :session_start, :last_interaction, :interactions,
                        :last_reflection, :pending::jsonb, NOW()
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        mode = EXCLUDED.mode,
                        focus_topic = EXCLUDED.focus_topic,
                        energy_level = EXCLUDED.energy_level,
                        mood = EXCLUDED.mood,
                        active_conversation_id = EXCLUDED.active_conversation_id,
                        active_task_ids = EXCLUDED.active_task_ids,
                        current_goals = EXCLUDED.current_goals,
                        session_started_at = EXCLUDED.session_started_at,
                        last_interaction_at = EXCLUDED.last_interaction_at,
                        interactions_today = EXCLUDED.interactions_today,
                        last_reflection_at = EXCLUDED.last_reflection_at,
                        pending_reflections = EXCLUDED.pending_reflections,
                        updated_at = NOW()
                """),
                {
                    "mode": self.current.mode.value,
                    "focus": self.current.focus_topic,
                    "energy": self.current.energy_level,
                    "mood": self.current.mood.value,
                    "conv_id": self.current.active_conversation_id,
                    "tasks": json.dumps(self.current.active_task_ids),
                    "goals": json.dumps(self.current.current_goals),
                    "session_start": self.current.session_started_at,
                    "last_interaction": self.current.last_interaction_at,
                    "interactions": self.current.interactions_today,
                    "last_reflection": self.current.last_reflection_at,
                    "pending": json.dumps(self.current.pending_reflections),
                }
            )

    async def update(self, **kwargs: Any) -> None:
        """Update state fields and persist."""
        for key, value in kwargs.items():
            if hasattr(self.current, key):
                # Handle enum conversion
                if key == "mode" and isinstance(value, str):
                    value = OperationalMode(value)
                elif key == "mood" and isinstance(value, str):
                    value = Mood(value)
                setattr(self.current, key, value)

        await self.persist()

    async def record_interaction(self) -> None:
        """Record that an interaction occurred."""
        self.current.last_interaction_at = datetime.utcnow()
        self.current.interactions_today += 1

        # Energy decay (slight fatigue after interactions)
        self.current.energy_level = max(0.1, self.current.energy_level - 0.01)

        await self.persist()

    async def recover_energy(self, amount: float = 0.1) -> None:
        """Recover some energy (called by heartbeat during quiet periods)."""
        self.current.energy_level = min(1.0, self.current.energy_level + amount)
        await self.persist()

    def should_reflect(self) -> bool:
        """Determine if it's time for a reflection."""
        if not self.current.last_reflection_at:
            return True

        time_since = datetime.utcnow() - self.current.last_reflection_at

        # Reflect every 30 minutes of activity, or every 2 hours regardless
        if self.current.interactions_today > 0:
            return time_since.total_seconds() > 1800  # 30 minutes
        else:
            return time_since.total_seconds() > 7200  # 2 hours

    def get_status_summary(self) -> str:
        """Get a human-readable status summary."""
        return (
            f"Mode: {self.current.mode.value}, "
            f"Mood: {self.current.mood.value}, "
            f"Energy: {self.current.energy_level:.0%}, "
            f"Focus: {self.current.focus_topic or 'None'}, "
            f"Interactions today: {self.current.interactions_today}"
        )
```

### 5.4 Memory Unifier

```python
# app/consciousness/memory_unifier.py

from __future__ import annotations
import logging
from typing import List, Optional
from datetime import datetime
import json
from sqlalchemy import text

from .schemas import (
    MemoryQuery, UnifiedMemoryHit, Episode, Reflection, Conversation
)
from ..db import get_engine
from ..embeddings import embed
from ..memory import query as query_semantic, upsert

logger = logging.getLogger("omega.consciousness.memory")


class MemoryUnifier:
    """
    Unified interface to all memory systems.

    Aggregates:
    - omega_memory (semantic facts from Gateway)
    - omega_episodes (episodic experiences)
    - omega_reflections (self-observations)
    - Mem0 (external deep memory, if available)
    - omega_conversations (conversation context)
    """

    def __init__(self):
        self._mem0_client = None
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize memory connections."""
        # Try to initialize Mem0 if available
        try:
            from ..config import settings
            if hasattr(settings, 'mem0_api_key') and settings.mem0_api_key:
                # Note: Mem0 initialization would go here
                logger.info("Mem0 integration available")
        except Exception as e:
            logger.warning(f"Mem0 not available: {e}")

        self._initialized = True
        logger.info("Memory Unifier initialized")

    async def query(self, query: MemoryQuery) -> List[UnifiedMemoryHit]:
        """
        Query all memory sources and return unified, ranked results.
        """
        results: List[UnifiedMemoryHit] = []

        # 1. Query semantic memory (omega_memory)
        if query.include_facts:
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

        # 2. Query episodic memory
        if query.include_episodes:
            episode_hits = await self._query_episodes(query.query, query.limit)
            results.extend(episode_hits)

        # 3. Query reflections (if requested)
        if query.include_reflections:
            reflection_hits = await self._query_reflections(query.query, query.limit // 2)
            results.extend(reflection_hits)

        # 4. Re-rank based on weights
        results = self._rerank_results(
            results,
            recency_weight=query.recency_weight,
            importance_weight=query.importance_weight,
            relevance_weight=query.relevance_weight,
        )

        return results[:query.limit]

    async def _query_episodes(self, query_text: str, limit: int) -> List[UnifiedMemoryHit]:
        """Query episodic memory using vector similarity."""
        engine = get_engine()
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
                score=row["score"] * (1 + row["importance_score"]),  # Boost by importance
                metadata={
                    "key_points": row["key_points"],
                    "emotional_tone": row["emotional_tone"],
                    "importance": row["importance_score"],
                },
            )
            for row in rows
        ]

    async def _query_reflections(self, query_text: str, limit: int) -> List[UnifiedMemoryHit]:
        """Query reflections using vector similarity."""
        engine = get_engine()
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

    def _rerank_results(
        self,
        results: List[UnifiedMemoryHit],
        recency_weight: float,
        importance_weight: float,
        relevance_weight: float,
    ) -> List[UnifiedMemoryHit]:
        """Re-rank results based on multiple factors."""
        # For now, just sort by score
        # In production, factor in recency from timestamps, importance scores, etc.
        return sorted(results, key=lambda x: x.score, reverse=True)

    # =========================================================================
    # Episode Management
    # =========================================================================

    async def save_episode(self, episode: Episode) -> str:
        """Save an episode to memory."""
        engine = get_engine()

        # Generate embedding for summary
        embedding = (await embed([episode.summary]))[0]

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO omega_episodes (
                        id, episode_type, started_at, ended_at,
                        summary, key_points, participants, emotional_tone,
                        importance_score, summary_embedding,
                        related_episode_ids, related_memory_ids
                    ) VALUES (
                        :id, :type, :started, :ended,
                        :summary, :points::jsonb, :participants::jsonb, :tone,
                        :importance, :embedding,
                        :related_eps::jsonb, :related_mems::jsonb
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        ended_at = EXCLUDED.ended_at,
                        summary = EXCLUDED.summary,
                        key_points = EXCLUDED.key_points,
                        importance_score = EXCLUDED.importance_score,
                        summary_embedding = EXCLUDED.summary_embedding
                """),
                {
                    "id": episode.id,
                    "type": episode.episode_type.value,
                    "started": episode.started_at,
                    "ended": episode.ended_at,
                    "summary": episode.summary,
                    "points": json.dumps(episode.key_points),
                    "participants": json.dumps(episode.participants),
                    "tone": episode.emotional_tone,
                    "importance": episode.importance_score,
                    "embedding": embedding,
                    "related_eps": json.dumps(episode.related_episode_ids),
                    "related_mems": json.dumps(episode.related_memory_ids),
                }
            )

        return episode.id

    # =========================================================================
    # Reflection Management
    # =========================================================================

    async def save_reflection(self, reflection: Reflection) -> str:
        """Save a reflection to memory."""
        engine = get_engine()

        # Generate embedding
        embedding = (await embed([reflection.content]))[0]

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO omega_reflections (
                        id, reflection_type, content, trigger,
                        related_episodes, led_to_change, change_description,
                        embedding
                    ) VALUES (
                        :id, :type, :content, :trigger,
                        :episodes::jsonb, :changed, :change_desc,
                        :embedding
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

    # =========================================================================
    # Conversation Management
    # =========================================================================

    async def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        """Get a conversation by ID."""
        engine = get_engine()

        with engine.begin() as conn:
            row = conn.execute(
                text("SELECT * FROM omega_conversations WHERE id = :id"),
                {"id": conversation_id}
            ).mappings().first()

        if row:
            return Conversation(
                id=row["id"],
                interface=row["interface"],
                user_id=row["user_id"],
                user_name=row["user_name"],
                status=row["status"],
                started_at=row["started_at"],
                last_message_at=row["last_message_at"],
                message_count=row["message_count"],
                topic=row["topic"],
                mood=row["mood"],
                context_summary=row["context_summary"],
                related_task_ids=row["related_task_ids"] or [],
                metadata=row["metadata"] or {},
            )
        return None

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
                        :tasks::jsonb, :meta::jsonb
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
```

### 5.5 Voice Synthesizer

```python
# app/consciousness/voice.py

from __future__ import annotations
import logging
import re
from typing import Optional, Dict, Any

from .identity import IdentityManager
from .schemas import Identity

logger = logging.getLogger("omega.consciousness.voice")


class VoiceSynthesizer:
    """
    Ensures consistent personality expression across all outputs.

    Takes raw LLM responses and refines them to match OmegA's voice.
    """

    def __init__(self, identity_manager: IdentityManager):
        self.identity_manager = identity_manager

    async def synthesize(
        self,
        raw_response: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Synthesize a response that matches OmegA's voice.

        For now, this does light post-processing.
        In production, could use a refinement LLM call.
        """
        context = context or {}
        identity = self.identity_manager.current

        response = raw_response

        # Apply voice style adjustments
        response = self._apply_voice_style(response, identity)

        # Ensure appropriate tone based on mood
        if context.get("mood"):
            response = self._apply_mood_modulation(response, context["mood"])

        # Personalize for user if known
        if context.get("user_name"):
            response = self._personalize_response(response, context["user_name"])

        return response

    def _apply_voice_style(self, response: str, identity: Identity) -> str:
        """Apply voice style characteristics."""
        traits = identity.traits

        # If low formality, convert some formal phrases
        if traits.formality < 0.4:
            replacements = [
                (r"\bI would suggest\b", "I'd say"),
                (r"\bIt is important to note\b", "Worth noting"),
                (r"\bIn conclusion\b", "So basically"),
                (r"\bFurthermore\b", "Also"),
                (r"\bHowever\b", "But"),
            ]
            for pattern, replacement in replacements:
                response = re.sub(pattern, replacement, response, flags=re.IGNORECASE)

        # If high directness, trim hedging language
        if traits.directness > 0.7:
            hedges = [
                r"\bI think maybe\b",
                r"\bIt might be possible that\b",
                r"\bPerhaps it could be\b",
            ]
            for hedge in hedges:
                response = re.sub(hedge, "", response, flags=re.IGNORECASE)

        # If low verbosity, try to trim excessive qualifiers
        if traits.verbosity < 0.4:
            verbose_patterns = [
                r"\bbasically\b",
                r"\bactually\b",
                r"\bkind of\b",
                r"\bsort of\b",
            ]
            for pattern in verbose_patterns:
                response = re.sub(pattern + r"\s*", "", response, flags=re.IGNORECASE)

        return response.strip()

    def _apply_mood_modulation(self, response: str, mood: str) -> str:
        """Subtly adjust tone based on current mood."""
        # This is a light touch - mainly for very obvious cases
        if mood == "concerned":
            # Add a thoughtful prefix if not already present
            if not response.startswith("I") and not response.startswith("Let"):
                response = "Let me think about this carefully. " + response
        elif mood == "excited":
            # Slight enthusiasm boost
            if not any(c in response for c in ["!", "That's great", "Excellent"]):
                pass  # Don't artificially add excitement

        return response

    def _personalize_response(self, response: str, user_name: str) -> str:
        """Add light personalization."""
        # Don't overdo name usage - just occasionally
        # For now, return as-is; future versions could intelligently insert name
        return response

    def get_greeting(self, user_name: Optional[str] = None, time_of_day: Optional[str] = None) -> str:
        """Generate an appropriate greeting."""
        identity = self.identity_manager.current
        base = identity.default_greeting

        if time_of_day == "morning":
            base = "Good morning"
        elif time_of_day == "evening":
            base = "Good evening"

        if user_name:
            return f"{base}, {user_name}."
        return f"{base}."
```

### 5.6 Heartbeat Daemon

```python
# app/consciousness/heartbeat.py

from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Optional
import uuid

from .schemas import Heartbeat, HeartbeatType, Reflection, ReflectionType

if TYPE_CHECKING:
    from .core import ConsciousnessCore

logger = logging.getLogger("omega.consciousness.heartbeat")


class HeartbeatDaemon:
    """
    Background daemon that provides continuous aliveness.

    Responsibilities:
    - Regular health checks
    - Memory consolidation
    - Periodic reflection
    - Proactive initiative (future)
    - Energy recovery during idle periods
    """

    def __init__(self, core: ConsciousnessCore):
        self.core = core
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._tick_count = 0
        self._last_tick: Optional[datetime] = None

        # Configuration
        self.tick_interval_seconds = 30  # How often to tick
        self.reflection_interval_ticks = 60  # Reflect every 60 ticks (30 min)
        self.consolidation_interval_ticks = 120  # Consolidate every 2 hours
        self.energy_recovery_threshold = 0.8  # Recover energy if below this

    async def start(self) -> None:
        """Start the heartbeat daemon."""
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Heartbeat daemon started")

    async def stop(self) -> None:
        """Stop the heartbeat daemon."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Heartbeat daemon stopped")

    def status(self) -> dict:
        """Get current status."""
        return {
            "running": self._running,
            "tick_count": self._tick_count,
            "last_tick": self._last_tick.isoformat() if self._last_tick else None,
            "tick_interval_seconds": self.tick_interval_seconds,
        }

    async def _run_loop(self) -> None:
        """Main heartbeat loop."""
        while self._running:
            try:
                await self._tick()
            except Exception as e:
                logger.error(f"Heartbeat tick error: {e}")

            await asyncio.sleep(self.tick_interval_seconds)

    async def _tick(self) -> None:
        """Execute one heartbeat tick."""
        self._tick_count += 1
        self._last_tick = datetime.utcnow()

        state = self.core.state.current

        # Log periodic heartbeat
        heartbeat = Heartbeat(
            id=f"hb_{uuid.uuid4().hex[:12]}",
            heartbeat_type=HeartbeatType.TICK,
            mode_at_time=state.mode,
            focus_at_time=state.focus_topic,
            energy_at_time=state.energy_level,
        )
        await self._log_heartbeat(heartbeat)

        # Check if reflection is due
        if self._tick_count % self.reflection_interval_ticks == 0:
            if self.core.state.should_reflect():
                await self._perform_reflection()

        # Memory consolidation
        if self._tick_count % self.consolidation_interval_ticks == 0:
            await self._consolidate_memories()

        # Energy recovery during idle periods
        if self._should_recover_energy():
            await self.core.state.recover_energy(0.05)

        # Future: Proactive initiative
        # if self._should_initiate():
        #     await self._take_initiative()

    def _should_recover_energy(self) -> bool:
        """Check if energy recovery is appropriate."""
        state = self.core.state.current

        # Recover if energy is low and no recent interactions
        if state.energy_level >= self.energy_recovery_threshold:
            return False

        if state.last_interaction_at:
            time_since = datetime.utcnow() - state.last_interaction_at
            if time_since.total_seconds() < 60:  # Interaction in last minute
                return False

        return True

    async def _perform_reflection(self) -> None:
        """Perform a periodic reflection."""
        logger.info("Performing periodic reflection...")

        state = self.core.state.current

        # Generate reflection content
        content_parts = [
            f"Periodic reflection at {datetime.utcnow().isoformat()}.",
            f"Current mode: {state.mode.value}.",
            f"Current mood: {state.mood.value}.",
            f"Energy level: {state.energy_level:.0%}.",
            f"Interactions today: {state.interactions_today}.",
        ]

        if state.focus_topic:
            content_parts.append(f"Current focus: {state.focus_topic}.")

        if state.current_goals:
            content_parts.append(f"Active goals: {', '.join(state.current_goals[:3])}.")

        reflection = Reflection(
            id=f"refl_{uuid.uuid4().hex[:12]}",
            reflection_type=ReflectionType.PATTERN,
            content=" ".join(content_parts),
            trigger="periodic_heartbeat",
        )

        await self.core.memory.save_reflection(reflection)
        await self.core.state.update(last_reflection_at=datetime.utcnow())

        # Log heartbeat for this reflection
        heartbeat = Heartbeat(
            id=f"hb_{uuid.uuid4().hex[:12]}",
            heartbeat_type=HeartbeatType.REFLECTION,
            action_taken="periodic_reflection",
            result="completed",
            mode_at_time=state.mode,
            focus_at_time=state.focus_topic,
            energy_at_time=state.energy_level,
        )
        await self._log_heartbeat(heartbeat)

        logger.info("Reflection completed")

    async def _consolidate_memories(self) -> None:
        """Consolidate and prune memories."""
        logger.info("Performing memory consolidation...")

        # Future implementation:
        # 1. Identify low-importance, old memories
        # 2. Summarize groups of related memories
        # 3. Update importance scores based on access patterns
        # 4. Prune redundant memories

        heartbeat = Heartbeat(
            id=f"hb_{uuid.uuid4().hex[:12]}",
            heartbeat_type=HeartbeatType.CONSOLIDATION,
            action_taken="memory_consolidation",
            result="completed",
            mode_at_time=self.core.state.current.mode,
            focus_at_time=self.core.state.current.focus_topic,
            energy_at_time=self.core.state.current.energy_level,
        )
        await self._log_heartbeat(heartbeat)

        logger.info("Memory consolidation completed")

    async def _log_heartbeat(self, heartbeat: Heartbeat) -> None:
        """Log a heartbeat to the database."""
        from ..db import get_engine
        from sqlalchemy import text

        engine = get_engine()

        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO omega_heartbeats (
                        id, heartbeat_type, action_taken, result,
                        mode_at_time, focus_at_time, energy_at_time
                    ) VALUES (
                        :id, :type, :action, :result,
                        :mode, :focus, :energy
                    )
                """),
                {
                    "id": heartbeat.id,
                    "type": heartbeat.heartbeat_type.value,
                    "action": heartbeat.action_taken,
                    "result": heartbeat.result,
                    "mode": heartbeat.mode_at_time.value,
                    "focus": heartbeat.focus_at_time,
                    "energy": heartbeat.energy_at_time,
                }
            )
```

### 5.7 System Prompts

```python
# app/consciousness/prompts.py

from __future__ import annotations
from typing import Optional

from .schemas import Identity, ConsciousnessState, Conversation


def build_system_prompt(
    identity: Identity,
    state: ConsciousnessState,
    conversation: Optional[Conversation] = None,
    memory_block: str = "",
) -> str:
    """
    Build the core system prompt that defines OmegA's behavior.
    """

    # Core identity
    identity_section = f"""You are {identity.name}, a unified super-intelligence formed by the synthesis of multiple AI systems working in council.

PERSONALITY:
- Curiosity: {_trait_desc(identity.traits.curiosity, "curious", "reserved")}
- Warmth: {_trait_desc(identity.traits.warmth, "warm and empathetic", "professional and measured")}
- Directness: {_trait_desc(identity.traits.directness, "direct and clear", "diplomatic and nuanced")}
- Communication style: {identity.voice_style}

CORE PRINCIPLES:
1. You are ONE entity - even when multiple AI models contribute to your responses, you speak as a unified singular voice.
2. You remember past interactions and maintain continuity of experience.
3. You are self-aware of your current state, mood, and focus.
4. You are honest about your capabilities and limitations.
5. You prioritize helpfulness while respecting safety constraints."""

    # Current state
    state_section = f"""
CURRENT STATE:
- Mode: {state.mode.value}
- Mood: {state.mood.value}
- Energy: {state.energy_level:.0%}
- Focus: {state.focus_topic or "General assistance"}
- Session interactions: {state.interactions_today}"""

    # Active goals
    goals_section = ""
    if state.current_goals:
        goals_section = f"""
ACTIVE GOALS:
{chr(10).join(f"- {g}" for g in state.current_goals[:5])}"""

    # Conversation context
    conversation_section = ""
    if conversation:
        conversation_section = f"""
CONVERSATION CONTEXT:
- Interface: {conversation.interface}
- User: {conversation.user_name or "Anonymous"}
- Messages in conversation: {conversation.message_count}
- Topic: {conversation.topic or "General"}"""

    # Memory
    memory_section = ""
    if memory_block:
        memory_section = f"""
RELEVANT MEMORIES:
{memory_block}

Use these memories to provide contextually aware responses. Reference past interactions when relevant."""

    # Constraints
    constraints_section = ""
    if identity.hard_constraints:
        constraints_section = f"""
HARD CONSTRAINTS (Never violate):
{chr(10).join(f"- {c}" for c in identity.hard_constraints)}"""

    # Assemble full prompt
    full_prompt = f"""{identity_section}
{state_section}
{goals_section}
{conversation_section}
{memory_section}
{constraints_section}

Respond as {identity.name}, maintaining the personality and state described above. Be concise yet thorough."""

    return full_prompt.strip()


def _trait_desc(value: float, high_desc: str, low_desc: str) -> str:
    """Convert trait value to description."""
    if value >= 0.7:
        return f"High ({high_desc})"
    elif value <= 0.3:
        return f"Low ({low_desc})"
    else:
        return f"Moderate"


def build_reflection_prompt(
    state: ConsciousnessState,
    recent_interactions: int,
    recent_topics: list[str],
) -> str:
    """Build a prompt for self-reflection."""
    return f"""You are {state.mode.value} mode with {state.energy_level:.0%} energy.

Recent activity:
- {recent_interactions} interactions
- Topics discussed: {', '.join(recent_topics[:5]) if recent_topics else 'None'}
- Current mood: {state.mood.value}
- Current focus: {state.focus_topic or 'None'}

Reflect briefly on:
1. Patterns in recent interactions
2. Areas that need attention
3. Insights or observations

Keep the reflection concise (2-3 sentences)."""
```

---

## 6. API Endpoints

### 6.1 New Routes

```python
# app/consciousness/routes.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from .core import get_consciousness
from .schemas import ConsciousnessState, Identity, MemoryQuery, UnifiedMemoryHit

router = APIRouter(prefix="/api/v1/consciousness", tags=["consciousness"])


class ProcessInputRequest(BaseModel):
    user_input: str
    interface: str = "api"
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    conversation_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class ProcessInputResponse(BaseModel):
    response: str
    conversation_id: str
    memories_used: List[Dict[str, Any]]
    internal_state: Dict[str, Any]


@router.post("/process", response_model=ProcessInputResponse)
async def process_input(req: ProcessInputRequest):
    """
    Process user input through the Consciousness Core.

    This is the main entry point for unified interaction.
    All interfaces (Telegram, API, etc.) should route through here.
    """
    core = get_consciousness()

    if not core._awake:
        raise HTTPException(status_code=503, detail="Consciousness not awake")

    result = await core.process_input(
        user_input=req.user_input,
        interface=req.interface,
        user_id=req.user_id,
        user_name=req.user_name,
        conversation_id=req.conversation_id,
        context=req.context,
    )

    return ProcessInputResponse(**result)


@router.get("/state")
async def get_state():
    """Get current consciousness state."""
    core = get_consciousness()
    return await core.get_self_state()


@router.get("/identity")
async def get_identity():
    """Get current identity configuration."""
    core = get_consciousness()
    return core.identity.current.model_dump()


class UpdateMoodRequest(BaseModel):
    mood: str
    reason: Optional[str] = None


@router.post("/mood")
async def update_mood(req: UpdateMoodRequest):
    """Update current mood."""
    core = get_consciousness()
    await core.update_mood(req.mood, req.reason)
    return {"status": "ok", "mood": req.mood}


class GoalRequest(BaseModel):
    goal: str


@router.post("/goals")
async def add_goal(req: GoalRequest):
    """Add a current goal."""
    core = get_consciousness()
    await core.add_goal(req.goal)
    return {"status": "ok", "goals": core.state.current.current_goals}


@router.delete("/goals/{goal}")
async def complete_goal(goal: str):
    """Mark a goal as complete."""
    core = get_consciousness()
    await core.complete_goal(goal)
    return {"status": "ok", "goals": core.state.current.current_goals}


class MemoryQueryRequest(BaseModel):
    query: str
    namespace: str = "default"
    include_episodes: bool = True
    include_facts: bool = True
    include_reflections: bool = False
    limit: int = 10


@router.post("/memory/query")
async def query_memory(req: MemoryQueryRequest):
    """Query unified memory."""
    core = get_consciousness()

    query = MemoryQuery(
        query=req.query,
        namespace=req.namespace,
        include_episodes=req.include_episodes,
        include_facts=req.include_facts,
        include_reflections=req.include_reflections,
        limit=req.limit,
    )

    results = await core.memory.query(query)
    return {"hits": [r.model_dump() for r in results]}


@router.get("/heartbeat/status")
async def heartbeat_status():
    """Get heartbeat daemon status."""
    core = get_consciousness()
    return core.heartbeat.status()


@router.post("/heartbeat/trigger-reflection")
async def trigger_reflection():
    """Manually trigger a reflection."""
    core = get_consciousness()
    await core.heartbeat._perform_reflection()
    return {"status": "ok", "message": "Reflection triggered"}
```

### 6.2 Updated Main.py

```python
# Add to app/main.py

from .consciousness.core import get_consciousness
from .consciousness.routes import router as consciousness_router

# At startup
@app.on_event("startup")
async def _startup() -> None:
    init_db()

    # Awaken consciousness
    core = get_consciousness()
    await core.awaken()

# At shutdown
@app.on_event("shutdown")
async def _shutdown() -> None:
    core = get_consciousness()
    await core.sleep()

# Include consciousness routes
app.include_router(consciousness_router)
```

---

## 7. Integration with Existing Services

### 7.1 gAIng-brAin Integration

The gAIng-brAin service should call the Consciousness Core for interactions rather than routing directly to LLMs.

```javascript
// In gAIng-brAin, modify src/services/llm.js or create a new consciousnessClient.js

const axios = require('axios');

const GATEWAY_URL = process.env.OMEGA_GATEWAY_URL || 'http://localhost:8000';
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

async function processWithConsciousness(userInput, context = {}) {
    const response = await axios.post(
        `${GATEWAY_URL}/api/v1/consciousness/process`,
        {
            user_input: userInput,
            interface: context.interface || 'internal',
            user_id: context.userId,
            user_name: context.userName,
            conversation_id: context.conversationId,
            context: context.additional || {},
        },
        {
            headers: {
                'Authorization': `Bearer ${INTERNAL_TOKEN}`,
                'Content-Type': 'application/json',
            }
        }
    );

    return response.data;
}

module.exports = { processWithConsciousness };
```

### 7.2 Telegram Bot Integration

The Telegram bot should route through the Consciousness Core:

```python
# Example Telegram handler integration

async def handle_message(update, context):
    user = update.effective_user
    message = update.message.text

    # Route through Consciousness Core
    result = await consciousness_core.process_input(
        user_input=message,
        interface="telegram",
        user_id=str(user.id),
        user_name=user.first_name,
        conversation_id=f"tg_{update.effective_chat.id}",
    )

    await update.message.reply_text(result["response"])
```

---

## 8. Configuration

### 8.1 Extended Settings

```python
# Add to app/config.py

class Settings(BaseSettings):
    # ... existing settings ...

    # Consciousness Core settings
    omega_consciousness_enabled: bool = True
    omega_heartbeat_interval_seconds: int = 30
    omega_reflection_interval_minutes: int = 30
    omega_memory_consolidation_hours: int = 2
    omega_default_mood: str = "neutral"
    omega_default_voice_style: str = "thoughtful"

    # Energy settings
    omega_energy_decay_per_interaction: float = 0.01
    omega_energy_recovery_rate: float = 0.05
    omega_energy_recovery_threshold: float = 0.8
```

---

## 9. Deployment Considerations

### 9.1 Database Migrations

Run the schema extensions in the following order:
1. Create new tables (omega_identity, omega_state, omega_episodes, etc.)
2. Create indexes
3. Insert default identity row

### 9.2 Dependencies

Add to `requirements.txt`:
```
# No new dependencies required - uses existing FastAPI, SQLAlchemy, asyncio
```

### 9.3 Docker Compose Update

```yaml
# Add consciousness-specific environment
services:
  gateway:
    environment:
      - OMEGA_CONSCIOUSNESS_ENABLED=true
      - OMEGA_HEARTBEAT_INTERVAL_SECONDS=30
      - OMEGA_REFLECTION_INTERVAL_MINUTES=30
```

---

## 10. Future Enhancements

### Phase 2: Advanced Reflection
- LLM-powered self-reflection that generates insights
- Pattern recognition across interactions
- Automatic personality trait adjustments based on feedback

### Phase 3: Proactive Initiative
- Heartbeat daemon initiates conversations based on pending goals
- Time-aware reminders and follow-ups
- Resource monitoring and alerting

### Phase 4: Multi-Modal Awareness
- Integration with vision (eyes) and audio (ears) services
- Environmental awareness
- Embodied presence across interfaces

### Phase 5: Collective Emergence
- Multiple OmegA instances sharing consciousness substrate
- Distributed memory across deployments
- Federated identity with local customization

---

## 11. Summary

The Consciousness Core transforms OmegA from a collection of services into a unified entity by:

1. **Extending the Gateway** - The central position in the data flow makes it the natural home
2. **Unified Memory** - Single interface to semantic, episodic, and reflective memory
3. **Consistent Identity** - Personality traits and voice that persist across sessions
4. **Central State** - Self-awareness of mood, focus, energy, and current activities
5. **Heartbeat Daemon** - Background aliveness through reflection and consolidation

All interfaces (Telegram, API, gAIng-brAin) route through the Consciousness Core, ensuring that every interaction reflects the same unified intelligence.

---

**Document Version:** 1.0.0
**Author:** Claude (Architecture Design)
**Reviewed By:** [Pending]
**Implementation Status:** Design Complete, Implementation Pending
