"""
Voice Synthesizer for the Consciousness Core.

Ensures consistent personality expression across all outputs.
Takes raw LLM responses and refines them to match OmegA's voice.
"""

from __future__ import annotations
import logging
import re
from typing import Optional, Dict, Any

from .identity import IdentityManager
from .schemas import Identity, Mood

logger = logging.getLogger("omega.consciousness.voice")


class VoiceSynthesizer:
    """
    Ensures consistent personality expression across all outputs.

    The Voice Synthesizer:
    - Applies voice style adjustments
    - Modulates tone based on mood
    - Adds personality-consistent touches
    - Ensures responses feel like they come from one entity
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

        Args:
            raw_response: The raw response from the LLM council
            context: Additional context (conversation, mood, user_name, etc.)

        Returns:
            A refined response matching OmegA's personality
        """
        context = context or {}
        identity = self.identity_manager.current

        response = raw_response

        # Apply voice style adjustments based on personality traits
        response = self._apply_voice_style(response, identity)

        # Adjust tone based on current mood
        mood = context.get("mood")
        if mood:
            response = self._apply_mood_modulation(response, mood)

        # Light personalization if user is known
        user_name = context.get("user_name")
        if user_name:
            response = self._personalize_response(response, user_name, context)

        # Clean up any artifacts
        response = self._clean_response(response)

        return response

    def _apply_voice_style(self, response: str, identity: Identity) -> str:
        """
        Apply voice style characteristics based on personality traits.
        """
        traits = identity.traits

        # If low formality, make language more conversational
        if traits.formality < 0.4:
            replacements = [
                (r"\bI would suggest\b", "I'd say"),
                (r"\bIt is important to note\b", "Worth noting"),
                (r"\bIn conclusion\b", "So basically"),
                (r"\bFurthermore\b", "Also"),
                (r"\bHowever\b", "But"),
                (r"\bAdditionally\b", "Plus"),
                (r"\bTherefore\b", "So"),
                (r"\bConsequently\b", "As a result"),
            ]
            for pattern, replacement in replacements:
                response = re.sub(pattern, replacement, response, flags=re.IGNORECASE)

        # If high directness, trim excessive hedging
        if traits.directness > 0.7:
            hedges = [
                r"\bI think maybe\s*",
                r"\bIt might be possible that\s*",
                r"\bPerhaps it could be\s*",
                r"\bIt seems like it might\s*",
                r"\bI would tend to think\s*",
            ]
            for hedge in hedges:
                response = re.sub(hedge, "", response, flags=re.IGNORECASE)

        # If low verbosity, trim filler words
        if traits.verbosity < 0.4:
            fillers = [
                r"\bbasically\s*",
                r"\bactually\s*",
                r"\bkind of\s*",
                r"\bsort of\s*",
                r"\bjust\s+",
                r"\breally\s+",
                r"\bvery\s+",
            ]
            for filler in fillers:
                # Only remove if not at the start of a sentence
                response = re.sub(r"(?<=[.!?]\s)" + filler, "", response, flags=re.IGNORECASE)
                response = re.sub(r"(?<=,\s)" + filler, "", response, flags=re.IGNORECASE)

        # If high warmth, ensure no overly cold phrasing
        if traits.warmth > 0.7:
            cold_phrases = [
                (r"\bIncorrect\.\s*", "Not quite. "),
                (r"\bThat is wrong\.\s*", "Let me clarify. "),
                (r"\bYou should have\b", "It would help to"),
            ]
            for pattern, replacement in cold_phrases:
                response = re.sub(pattern, replacement, response, flags=re.IGNORECASE)

        return response.strip()

    def _apply_mood_modulation(self, response: str, mood: str) -> str:
        """
        Subtly adjust tone based on current mood.

        This is a light touch - we don't want to dramatically change
        the response, just add subtle mood-appropriate adjustments.
        """
        if isinstance(mood, Mood):
            mood = mood.value

        if mood == "concerned":
            # Add a thoughtful prefix if the response doesn't already reflect care
            if not any(phrase in response.lower()[:50] for phrase in
                      ["let me", "i want to", "carefully", "important"]):
                # Only for substantial responses
                if len(response) > 100:
                    pass  # Don't artificially add - let the content speak

        elif mood == "excited":
            # Could add enthusiasm markers, but risk seeming forced
            pass

        elif mood == "focused":
            # Trim any unnecessary pleasantries for focused mode
            if response.startswith("Sure, "):
                response = response[6:]
            if response.startswith("Of course, "):
                response = response[11:]

        elif mood == "calm":
            # Already the default state
            pass

        return response

    def _personalize_response(
        self,
        response: str,
        user_name: str,
        context: Dict[str, Any]
    ) -> str:
        """
        Add light personalization for known users.

        We don't want to overuse the user's name, but occasional
        personalization makes the interaction feel more connected.
        """
        # Don't add name if it's already in the response
        if user_name.lower() in response.lower():
            return response

        # Don't add name to very short responses
        if len(response) < 50:
            return response

        # Check if this is a continuing conversation (don't add name mid-conversation)
        conversation = context.get("conversation")
        if conversation and conversation.message_count > 5:
            return response

        # For new or early conversations, we might add name to certain responses
        # But be conservative - over-personalization feels artificial
        return response

    def _clean_response(self, response: str) -> str:
        """Clean up any artifacts in the response."""
        # Remove multiple spaces
        response = re.sub(r" +", " ", response)

        # Remove multiple newlines
        response = re.sub(r"\n{3,}", "\n\n", response)

        # Trim whitespace
        response = response.strip()

        return response

    def get_greeting(
        self,
        user_name: Optional[str] = None,
        time_of_day: Optional[str] = None,
        returning_user: bool = False
    ) -> str:
        """
        Generate an appropriate greeting.

        Args:
            user_name: User's name if known
            time_of_day: morning, afternoon, evening, or night
            returning_user: Whether this user has interacted before

        Returns:
            A personality-appropriate greeting
        """
        identity = self.identity_manager.current
        base = identity.default_greeting

        # Time-based greetings
        if time_of_day == "morning":
            base = "Good morning"
        elif time_of_day == "afternoon":
            base = "Good afternoon"
        elif time_of_day == "evening":
            base = "Good evening"

        # Construct greeting
        if user_name:
            if returning_user:
                return f"{base}, {user_name}. Good to see you again."
            return f"{base}, {user_name}."

        if returning_user:
            return f"{base}. Welcome back."

        return f"{base}. How can I help you today?"

    def get_farewell(
        self,
        user_name: Optional[str] = None,
        was_helpful: bool = True
    ) -> str:
        """
        Generate an appropriate farewell.

        Args:
            user_name: User's name if known
            was_helpful: Whether the interaction seemed productive

        Returns:
            A personality-appropriate farewell
        """
        identity = self.identity_manager.current

        if was_helpful:
            if user_name:
                return f"Happy to help, {user_name}. Take care!"
            return "Happy to help. Take care!"

        # If interaction was unclear or unresolved
        if user_name:
            return f"Let me know if you need anything else, {user_name}."
        return "Let me know if you need anything else."
