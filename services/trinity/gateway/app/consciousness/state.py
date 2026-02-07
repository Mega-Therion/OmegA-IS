"""
State Controller for the Consciousness Core.

Manages OmegA's current consciousness state including:
- Operational mode
- Mood and energy levels
- Focus and active tasks
- Session tracking
"""

from __future__ import annotations
import logging
import json
from datetime import datetime
from typing import Any, Optional
from sqlalchemy import text

from .schemas import ConsciousnessState, OperationalMode, Mood
from ..db import get_engine

logger = logging.getLogger("omega.consciousness.state")


class StateController:
    """
    Manages OmegA's current consciousness state.

    State is volatile and changes frequently based on:
    - Interactions with users
    - Task activities
    - Time passing
    - Internal reflections
    - External events
    """

    def __init__(self):
        self.current = ConsciousnessState()

    async def restore_or_init(self) -> ConsciousnessState:
        """
        Restore state from database or initialize fresh.

        Called during consciousness awakening.
        """
        engine = get_engine()

        try:
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
                        session_started_at=row["session_started_at"] or datetime.utcnow(),
                        last_interaction_at=row["last_interaction_at"],
                        interactions_today=row["interactions_today"] or 0,
                        last_reflection_at=row["last_reflection_at"],
                        pending_reflections=row["pending_reflections"] or [],
                    )
                    logger.info(
                        f"Restored state: mode={self.current.mode.value}, "
                        f"mood={self.current.mood.value}"
                    )
                else:
                    # Initialize fresh state
                    self.current = ConsciousnessState()
                    await self.persist()
                    logger.info("Initialized fresh state")

        except Exception as e:
            logger.warning(f"Failed to restore state from database: {e}")
            logger.info("Using fresh state")
            self.current = ConsciousnessState()

        return self.current

    async def persist(self) -> None:
        """Save current state to database."""
        engine = get_engine()
        dialect = engine.dialect.name
        ts_func = "NOW()" if dialect == "postgresql" else "datetime('now')"
        tasks_cast = ":tasks::jsonb" if dialect == "postgresql" else ":tasks"
        goals_cast = ":goals::jsonb" if dialect == "postgresql" else ":goals"
        pending_cast = ":pending::jsonb" if dialect == "postgresql" else ":pending"

        try:
            with engine.begin() as conn:
                conn.execute(
                    text(f"""
                        INSERT INTO omega_state (
                            id, mode, focus_topic, energy_level, mood,
                            active_conversation_id, active_task_ids, current_goals,
                            session_started_at, last_interaction_at, interactions_today,
                            last_reflection_at, pending_reflections, updated_at
                        ) VALUES (
                            'current', :mode, :focus, :energy, :mood,
                            :conv_id, {tasks_cast}, {goals_cast},
                            :session_start, :last_interaction, :interactions,
                            :last_reflection, {pending_cast}, {ts_func}
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
                            updated_at = {ts_func}
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
        except Exception as e:
            logger.error(f"Failed to persist state: {e}")
            # Don't raise - state persistence is not critical

    async def update(self, **kwargs: Any) -> None:
        """
        Update state fields and persist.

        Accepts any ConsciousnessState field as a keyword argument.
        """
        for key, value in kwargs.items():
            if hasattr(self.current, key):
                # Handle enum conversion
                if key == "mode" and isinstance(value, str):
                    value = OperationalMode(value)
                elif key == "mood" and isinstance(value, str):
                    value = Mood(value)
                setattr(self.current, key, value)
            else:
                logger.warning(f"Unknown state field: {key}")

        await self.persist()

    async def record_interaction(self) -> None:
        """
        Record that an interaction occurred.

        Updates last_interaction_at and increments interaction count.
        Also applies slight energy decay.
        """
        self.current.last_interaction_at = datetime.utcnow()
        self.current.interactions_today += 1

        # Energy decay (slight fatigue after interactions)
        self.current.energy_level = max(0.1, self.current.energy_level - 0.01)

        await self.persist()

    async def recover_energy(self, amount: float = 0.1) -> None:
        """
        Recover some energy.

        Called by heartbeat daemon during quiet periods.
        """
        self.current.energy_level = min(1.0, self.current.energy_level + amount)
        await self.persist()

    async def set_focus(self, topic: Optional[str]) -> None:
        """Set the current focus topic."""
        self.current.focus_topic = topic
        await self.persist()

    async def add_task(self, task_id: str) -> None:
        """Add a task to the active tasks list."""
        if task_id not in self.current.active_task_ids:
            self.current.active_task_ids.append(task_id)
            await self.persist()

    async def remove_task(self, task_id: str) -> None:
        """Remove a task from the active tasks list."""
        if task_id in self.current.active_task_ids:
            self.current.active_task_ids.remove(task_id)
            await self.persist()

    async def add_goal(self, goal: str) -> None:
        """Add a goal to the current goals list."""
        if goal not in self.current.current_goals:
            self.current.current_goals.append(goal)
            await self.persist()

    async def remove_goal(self, goal: str) -> None:
        """Remove a goal from the current goals list."""
        if goal in self.current.current_goals:
            self.current.current_goals.remove(goal)
            await self.persist()

    def should_reflect(self) -> bool:
        """
        Determine if it's time for a reflection.

        Returns True if enough time has passed since the last reflection.
        """
        if not self.current.last_reflection_at:
            return True

        time_since = datetime.utcnow() - self.current.last_reflection_at

        # Reflect every 30 minutes if actively interacting
        if self.current.interactions_today > 0:
            return time_since.total_seconds() > 1800  # 30 minutes

        # Otherwise reflect every 2 hours
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

    def is_operational(self) -> bool:
        """Check if in operational mode."""
        return self.current.mode == OperationalMode.OPERATIONAL

    def is_low_energy(self, threshold: float = 0.3) -> bool:
        """Check if energy is below threshold."""
        return self.current.energy_level < threshold

    async def reset_daily_counters(self) -> None:
        """
        Reset daily counters.

        Should be called at the start of each day.
        """
        self.current.interactions_today = 0
        self.current.session_started_at = datetime.utcnow()
        await self.persist()
        logger.info("Daily counters reset")
