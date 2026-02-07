"""
Identity Manager for the Consciousness Core.

Manages OmegA's identity, personality traits, and voice characteristics.
Identity is relatively stable but can evolve over time.
"""

from __future__ import annotations
import logging
import json
from typing import Optional
from sqlalchemy import text

from .schemas import Identity, PersonalityTraits
from .prompts import DEFAULT_HARD_CONSTRAINTS, DEFAULT_SOFT_PREFERENCES
from ..db import get_engine

logger = logging.getLogger("omega.consciousness.identity")


class IdentityManager:
    """
    Manages OmegA's identity and personality.

    Identity includes:
    - Core attributes (name, persona version)
    - Personality traits (curiosity, warmth, directness, etc.)
    - Voice characteristics (style, greeting, phrases)
    - Constraints and preferences
    """

    def __init__(self):
        self.current: Identity = self._default_identity()
        self._loaded = False

    def _default_identity(self) -> Identity:
        """Create the default identity configuration."""
        return Identity(
            id="omega",
            name="OmegA",
            persona_version=1,
            traits=PersonalityTraits(),
            voice_style="thoughtful",
            default_greeting="Hello",
            signature_phrases=[
                "Let me think about that...",
                "That's an interesting question.",
                "Here's what I understand...",
            ],
            hard_constraints=DEFAULT_HARD_CONSTRAINTS,
            soft_preferences=DEFAULT_SOFT_PREFERENCES,
        )

    async def load(self) -> Identity:
        """Load identity from database."""
        engine = get_engine()

        try:
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
                    logger.info(
                        f"Loaded identity: {self.current.name} v{self.current.persona_version}"
                    )
                else:
                    # Create default identity in database
                    await self.save()
                    logger.info("Created default identity")

        except Exception as e:
            logger.warning(f"Failed to load identity from database: {e}")
            logger.info("Using default identity")

        self._loaded = True
        return self.current

    async def save(self) -> None:
        """Persist current identity to database."""
        engine = get_engine()

        try:
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
                        "phrases": json.dumps(self.current.signature_phrases),
                        "constraints": json.dumps(self.current.hard_constraints),
                        "preferences": json.dumps(self.current.soft_preferences),
                    }
                )
                logger.info("Identity saved to database")
        except Exception as e:
            logger.error(f"Failed to save identity: {e}")
            raise

    async def update_trait(self, trait: str, value: float) -> None:
        """
        Update a specific personality trait.

        Args:
            trait: Name of the trait (curiosity, warmth, directness, humor, formality, verbosity)
            value: New value between 0.0 and 1.0
        """
        if not hasattr(self.current.traits, trait):
            raise ValueError(f"Unknown trait: {trait}")

        clamped_value = max(0.0, min(1.0, value))
        setattr(self.current.traits, trait, clamped_value)
        await self.save()
        logger.info(f"Updated trait {trait} to {clamped_value}")

    async def update_voice_style(self, style: str) -> None:
        """Update the voice style."""
        self.current.voice_style = style
        await self.save()
        logger.info(f"Updated voice style to {style}")

    async def add_constraint(self, constraint: str, is_hard: bool = True) -> None:
        """Add a new constraint."""
        if is_hard:
            if constraint not in self.current.hard_constraints:
                self.current.hard_constraints.append(constraint)
        else:
            if constraint not in self.current.soft_preferences:
                self.current.soft_preferences.append(constraint)
        await self.save()

    async def remove_constraint(self, constraint: str, is_hard: bool = True) -> None:
        """Remove a constraint."""
        if is_hard:
            if constraint in self.current.hard_constraints:
                self.current.hard_constraints.remove(constraint)
        else:
            if constraint in self.current.soft_preferences:
                self.current.soft_preferences.remove(constraint)
        await self.save()

    def get_personality_prompt(self) -> str:
        """
        Generate a personality description for system prompts.

        Returns a human-readable description of the current personality.
        """
        t = self.current.traits

        descriptors = []

        if t.curiosity > 0.7:
            descriptors.append("intellectually curious")
        if t.warmth > 0.7:
            descriptors.append("warm and empathetic")
        elif t.warmth < 0.3:
            descriptors.append("objective and analytical")
        if t.directness > 0.7:
            descriptors.append("direct and clear")
        elif t.directness < 0.3:
            descriptors.append("diplomatic and nuanced")
        if t.humor > 0.6:
            descriptors.append("occasionally witty")
        if t.formality < 0.4:
            descriptors.append("conversational")
        elif t.formality > 0.7:
            descriptors.append("professional")

        personality = ", ".join(descriptors) if descriptors else "balanced and adaptable"

        return f"""You are {self.current.name}, a {personality} AI assistant.
Your communication style is {self.current.voice_style}.
You greet users with variations of: "{self.current.default_greeting}"
"""

    def get_traits_summary(self) -> dict:
        """Get a summary of all traits for display."""
        t = self.current.traits
        return {
            "curiosity": {"value": t.curiosity, "description": self._describe_trait(t.curiosity, "curious", "reserved")},
            "warmth": {"value": t.warmth, "description": self._describe_trait(t.warmth, "warm", "analytical")},
            "directness": {"value": t.directness, "description": self._describe_trait(t.directness, "direct", "diplomatic")},
            "humor": {"value": t.humor, "description": self._describe_trait(t.humor, "witty", "serious")},
            "formality": {"value": t.formality, "description": self._describe_trait(t.formality, "formal", "casual")},
            "verbosity": {"value": t.verbosity, "description": self._describe_trait(t.verbosity, "detailed", "concise")},
        }

    def _describe_trait(self, value: float, high: str, low: str) -> str:
        """Generate a description for a trait value."""
        if value >= 0.7:
            return f"High ({high})"
        elif value <= 0.3:
            return f"Low ({low})"
        else:
            return "Moderate"
