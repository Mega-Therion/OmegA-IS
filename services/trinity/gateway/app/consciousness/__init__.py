"""
OmegA Consciousness Core

The unified consciousness layer that transforms OmegA from a collection
of cooperating services into a coherent, singular intelligence.

Modules:
- identity: Identity management and personality traits
- state: Current consciousness state (mood, focus, energy)
- voice: Personality-consistent response synthesis
- schemas: Pydantic data models
- prompts: System prompts and personality definitions
"""

from .schemas import (
    Identity,
    PersonalityTraits,
    ConsciousnessState,
    OperationalMode,
    Mood,
    Episode,
    EpisodeType,
    Reflection,
    ReflectionType,
    Conversation,
    MemoryQuery,
    UnifiedMemoryHit,
    Heartbeat,
    HeartbeatType,
)

__all__ = [
    # Identity
    "Identity",
    "PersonalityTraits",
    # State
    "ConsciousnessState",
    "OperationalMode",
    "Mood",
    # Memory
    "Episode",
    "EpisodeType",
    "Reflection",
    "ReflectionType",
    "Conversation",
    "MemoryQuery",
    "UnifiedMemoryHit",
    # Heartbeat
    "Heartbeat",
    "HeartbeatType",
]
