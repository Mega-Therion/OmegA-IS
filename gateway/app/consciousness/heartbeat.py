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

        # Check if reflection is due
        if self._tick_count % self.reflection_interval_ticks == 0:
            if self.core.state.should_reflect():
                await self._perform_reflection()

        # Energy recovery during idle periods
        if self._should_recover_energy():
            await self.core.state.recover_energy(0.05)

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
        """Perform a periodic reflection."""
        logger.info("Performing periodic reflection...")
        state = self.core.state.current

        content = f"Periodic reflection. Status: {self.core.state.get_status_summary()}"
        
        reflection = Reflection(
            id=f"refl_{uuid.uuid4().hex[:12]}",
            reflection_type=ReflectionType.PATTERN,
            content=content,
            trigger="periodic_heartbeat",
        )

        try:
            await self.core.memory.save_reflection(reflection)
            await self.core.state.update(last_reflection_at=datetime.utcnow())
            logger.info("Reflection completed")
        except Exception as e:
            logger.error(f"Failed to save reflection: {e}")
