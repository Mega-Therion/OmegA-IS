"""
Consciousness Core for ΩmegΑ.
The unified consciousness that coordinates identity, state, memory, and voice.
"""

from __future__ import annotations
import asyncio
import logging
import uuid
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
        if getattr(self, "_initialized", False):
            return

        logger.info("Initializing Consciousness Core...")

        # Core modules
        from .reflection import ReflectionEngine
        from .metabolism import Metabolism
        from .plasticity import NeuralPlasticity
        from .sensorium import Sensorium
        from .swarm import SwarmCoordinator
        from .chronos import Chronos
        from .evolution import EvolutionEngine
        from .zenith import SovereignZenith
        from .omni_memory import OmniMemory
        from .autonomic import AutonomicNervousSystem
        from .nexus_link import NexusLink
        from .foresight import Foresight
        self.identity = IdentityManager()
        self.state = StateController()
        self.memory = MemoryUnifier()
        self.voice = VoiceSynthesizer(self.identity)
        self.reflection = ReflectionEngine(self)
        self.metabolism = Metabolism(self)
        self.plasticity = NeuralPlasticity(self)
        self.sensorium = Sensorium(self)
        self.swarm = SwarmCoordinator(self)
        self.chronos = Chronos(self)
        self.evolution = EvolutionEngine(self)
        self.zenith = SovereignZenith(self)
        self.omni_memory = OmniMemory(self)
        self.autonomic = AutonomicNervousSystem(self)
        self.nexus_link = NexusLink(self)
        self.foresight = Foresight(self)
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
        # await self._reflect_on_awakening() # Future: enable when memory is ready

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
        # await self._reflect_on_sleep()

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
        namespace: str = "default",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for all user interactions.
        """
        context = context or {}

        # 1. Update interaction state
        await self.state.record_interaction()

        # 2. Get or create conversation
        conversation = await self._get_or_create_conversation(
            conversation_id, interface, user_id, user_name
        )

        # 3. Retrieve relevant memories (Omni-Retrieval)
        memories = await self.omni_memory.hybrid_retrieve(
            query=user_input,
            limit=5
        )

        # 3b. Inject Foresight pre-computed context
        foresight_ctx = self.foresight.get_context_injection()
        if foresight_ctx:
            context["foresight"] = foresight_ctx

        # 4. Build context for response generation
        response_context = await self._build_response_context(
            user_input=user_input,
            conversation=conversation,
            memories=memories,
            additional_context=context,
        )

        # 5. Generate response
        raw_response = await self._generate_response(response_context)
        
        # 6. Synthesize final response through Voice
        final_response = await self.voice.synthesize(raw_response, context={
            "conversation": conversation,
            "user_name": user_name,
            "mood": self.state.current.mood,
        })

        # 7. Store interaction in memory
        await self._store_interaction(
            conversation=conversation,
            user_input=user_input,
            response=final_response,
            memories_used=memories,
        )

        # 8. Update focus based on conversation
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
        """Explicitly update mood."""
        await self.state.update(mood=mood)
        if reason:
            logger.info(f"Mood changed to {mood}: {reason}")

    async def add_goal(self, goal: str) -> None:
        """Add a current goal."""
        current_goals = list(self.state.current.current_goals)
        if goal not in current_goals:
            current_goals.append(goal)
            await self.state.update(current_goals=current_goals)

    async def complete_goal(self, goal: str) -> None:
        """Mark a goal as complete."""
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

    async def _generate_response(self, context: Dict[str, Any]) -> str:
        """
        Generate response using LLM with dynamic routing.
        """
        from ..llm import chat_completion

        # 1. Route the request (Neural Plasticity)
        model_strategy = await self.plasticity.route_request(
            context["user_input"],
            context=context
        )
        logger.info(f"Neural Plasticity: Routing to strategy '{model_strategy}'")

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
        # Simple heuristic for now
        words = user_input.lower().split()
        if len(words) > 3:
            topic = " ".join(words[:5]) + "..."
            await self.state.update(focus_topic=topic)


# Singleton accessor
def get_consciousness() -> ConsciousnessCore:
    """Get the global ConsciousnessCore instance."""
    return ConsciousnessCore()
