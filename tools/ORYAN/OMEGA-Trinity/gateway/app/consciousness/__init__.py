"""
OmegA Consciousness Core

The unified consciousness layer that transforms OmegA from a collection
of cooperating services into a coherent, singular intelligence.

Modules:
- core: ConsciousnessCore singleton - the main coordinator
- identity: Identity management and personality traits
- state: Current consciousness state (mood, focus, energy)
- memory_unifier: Unified interface to all memory systems
- voice: Personality-consistent response synthesis
- heartbeat: Background daemon for aliveness
- schemas: Pydantic data models
- prompts: System prompts and personality definitions
"""

from .core import ConsciousnessCore, get_consciousness
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
    # Core
    "ConsciousnessCore",
    "get_consciousness",
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
