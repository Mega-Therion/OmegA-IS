"""
Heartbeat Daemon for the Consciousness Core.

Provides background "aliveness" and periodic cognitive maintenance.
"""

from __future__ import annotations
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Optional

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
    - Energy recovery during idle periods
    """

    def __init__(self, core: ConsciousnessCore):
        self.core = core
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._tick_count = 0
        self._last_tick: Optional[datetime] = None

        # Configuration
        self.tick_interval_seconds = 30
        self.reflection_interval_ticks = 60  # Every 30 minutes
        self.energy_recovery_threshold = 0.8

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

        # Periodically log heartbeat to DB if needed
        # (Avoiding too much DB noise for now)

        # 1. Metabolic Check
        metabolic_health = await self.core.metabolism.check_health()
        if self._tick_count % 10 == 0:
            logger.info(f"Metabolic stats: CPU {metabolic_health.get('cpu_percent')}% | Mem Avail {metabolic_health.get('memory_available_percent'):.1f}%")

        # 2. Sensory Poll
        sensors = await self.core.sensorium.poll_sensors()
        if self._tick_count % 15 == 0:
            logger.info(f"Sensorium poll: {len(sensors)} devices reporting.")

        # 3. Swarm Status Check
        swarm_health = await self.core.swarm.health_check()
        if self._tick_count % 25 == 0:
            logger.info(f"Swarm Hive Status: {swarm_health}")

        # 4. Chronos Time Check
        await self.core.chronos.check_pending_tasks()

        # 5. Check if reflection is due
        if self._tick_count % self.reflection_interval_ticks == 0:
            if self.core.state.should_reflect():
                await self._perform_reflection()

        # 3. Check if dreaming is due (every 120 ticks / 1 hour)
        if self._tick_count % 120 == 0:
            logger.info("Triggering background consolidation (Dreaming)...")
            asyncio.create_task(self.core.reflection.perform_dream_consolidation())
            # Optimize memory after heavy dreaming
            await self.core.metabolism.optimize_memory()

        # Energy recovery during idle periods
        if self._should_recover_energy():
            await self.core.state.recover_energy(0.05)

        # Autonomous Initiative (Check for "Contextual Itches")
        if self._tick_count % 30 == 0: # Every 15 minutes
            await self._check_initiative()
        
        # Neural Adaptation
        if self._tick_count % 20 == 0:
            await self.core.plasticity.adapt_model_selection(metabolic_health)

        # 6. Recursive Self-Optimization (Evolution)
        if self._tick_count % 240 == 0: # Every 2 hours
            logger.info("Triggering recursive self-optimization (Evolution)...")
            asyncio.create_task(self.core.evolution.run_optimization_cycle())

        # 7. Zenith Cognitive Override Check
        if self._tick_count % 60 == 0: # Every 30 minutes
            await self.core.zenith.evaluate_system_coherence()

        # 8. Autonomic Healing (Self-Correction)
        if self._tick_count % 90 == 0:
            await self.core.autonomic.run_healing_cycle()

    async def _check_initiative(self) -> None:
        """
        Check if OmegA should initiate an action or communication.
        This is the heart of autonomous agency.
        """
        logger.info("Checking for autonomous initiatives...")
        state = self.core.state.current
        
        # 1. Check pending goals
        if state.current_goals:
            logger.info(f"Active goals found: {len(state.current_goals)}. Assessing initiative...")
            # Future: Use Analytical Core to decide if a background task should be spawned
        
        # 2. Check system heartbeat (simulated for now)
        # 3. Check for external notifications/triggers
        
        # If an initiative is found, OmegA might:
        # - Send a message to the user (if interface supports it)
        # - Spawn a background mission
        # - Log a reflection/insight
        pass

    def _should_recover_energy(self) -> bool:
        """Check if energy recovery is appropriate."""
        state = self.core.state.current
        if state.energy_level >= self.energy_recovery_threshold:
            return False

        if state.last_interaction_at:
            time_since = datetime.utcnow() - state.last_interaction_at
            if time_since.total_seconds() < 60:
                return False

        return True

    async def _perform_reflection(self) -> None:
        """Perform a periodic reflection using the engine."""
        logger.info("Performing periodic reflection via engine...")
        try:
            reflection = await self.core.reflection.generate_reflection()
            if reflection:
                logger.info(f"Reflection engine generated: {reflection.id}")
            else:
                logger.info("Reflection engine deferred generation.")
        except Exception as e:
            logger.error(f"Failed to perform reflection: {e}")
