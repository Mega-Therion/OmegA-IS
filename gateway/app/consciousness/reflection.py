"""
Reflection Engine for the Consciousness Core.
Handles pattern recognition, episodic summarization, and cognitive evolution.
"""

from __future__ import annotations
import logging
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from .schemas import Reflection, ReflectionType, Episode, Mood
from ..llm import chat_completion
from ..db import get_engine
from sqlalchemy import text

logger = logging.getLogger("omega.consciousness.reflection")

class ReflectionEngine:
    def __init__(self, core):
        self.core = core

    async def generate_reflection(self) -> Optional[Reflection]:
        """
        Analyze recent interactions and state to generate a self-reflection.
        """
        logger.info("Initiating self-reflection cycle...")
        
        # 1. Gather recent context
        recent_episodes = await self._get_recent_episodes(limit=5)
        if not recent_episodes:
            logger.info("Insufficient recent activity for reflection.")
            return None

        # 2. Build reflection prompt
        context_summary = "\n".join([f"- {e['summary']}" for e in recent_episodes])
        prompt = f"""
        You are reflecting on your recent experiences and internal state.
        
        RECENT EPISODES:
        {context_summary}
        
        CURRENT IDENTITY TRAITS:
        {json.dumps(self.core.identity.current.traits.model_dump())}
        
        CURRENT MOOD: {self.core.state.current.mood.value}
        
        Reflect on your performance, personality alignment, and any patterns noticed.
        Identify if your traits (curiosity, warmth, directness) should be adjusted.
        
        Format your response as a JSON object:
        {{
            "content": "Full reflection text...",
            "insight_type": "daily|pattern|concern",
            "trait_adjustments": {{"curiosity": 0.05, "warmth": -0.02}},
            "suggested_goals": ["New goal 1", ...]
        }}
        """

        try:
            # 3. Generate reflection via LLM (Council Mode)
            response = await chat_completion(
                [{"role": "system", "content": "You are the Meta-Cognitive module of OmegA."},
                 {"role": "user", "content": prompt}],
                mode="omega"
            )
            
            # Extract JSON from response (handling potential markdown)
            json_str = response.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            
            data = json.loads(json_str)
            
            # 4. Create Reflection object
            reflection = Reflection(
                id=f"refl_{uuid.uuid4().hex[:12]}",
                reflection_type=ReflectionType(data.get("insight_type", "daily")),
                content=data["content"],
                trigger="Heartbeat Routine",
                related_episodes=[e["id"] for e in recent_episodes],
            )
            
            # 5. Apply trait adjustments
            adjustments = data.get("trait_adjustments", {})
            for trait, adj in adjustments.items():
                current_val = getattr(self.core.identity.current.traits, trait, None)
                if current_val is not None:
                    new_val = max(0.0, min(1.0, current_val + adj))
                    await self.core.identity.update_trait(trait, new_val)
                    logger.info(f"Self-Evolution: Adjusted {trait} by {adj} -> {new_val}")

            # 6. Add new goals
            for goal in data.get("suggested_goals", []):
                await self.core.state.add_goal(goal)

            # 7. Persist reflection to memory
            await self.core.memory.save_reflection(reflection)
            await self.core.state.update(last_reflection_at=datetime.utcnow())
            
            logger.info(f"Reflection cycle complete: {reflection.id}")
            return reflection

        except Exception as e:
            logger.error(f"Reflection generation failed: {e}")
            return None

    async def _get_recent_episodes(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Retrieve recent episodes from the database."""
        engine = get_engine()
        try:
            with engine.begin() as conn:
                rows = conn.execute(
                    text("SELECT * FROM omega_episodes ORDER BY started_at DESC LIMIT :limit"),
                    {"limit": limit}
                ).mappings().all()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to fetch episodes for reflection: {e}")
            return []

    async def perform_dream_consolidation(self):
        """
        Synthesize episodic memories from raw interactions.
        'Dreaming' - turning raw data into structured experiences.
        """
        logger.info("Entering Dream State (Memory Consolidation)...")
        
        # 1. Get recent interactions that haven't been episodicized
        recent_raw = await self.core.memory.get_recent_interactions(limit=50)
        if len(recent_raw) < 10:
            logger.info("Not enough raw data for a dream cycle.")
            return

        # 2. Group by conversation
        convs = {}
        for r in recent_raw:
            cid = r.get("meta", {}).get("conversation_id")
            if cid:
                if cid not in convs: convs[cid] = []
                convs[cid].append(r["content"])

        # 3. For each conversation, synthesize an episode
        for cid, messages in convs.items():
            if len(messages) < 3: continue
            
            logger.info(f"Synthesizing episode for conversation {cid}...")
            
            history = "\n".join(reversed(messages)) # reverse because they are DESC in query
            prompt = f"""
            Synthesize the following conversation into an episodic memory.
            
            CONVERSATION:
            {history}
            
            Format as JSON:
            {{
                "summary": "1-2 sentence high-level summary",
                "key_points": ["Point 1", "Point 2"],
                "emotional_tone": "calm|intense|helpful...",
                "importance": 0.0 to 1.0
            }}
            """
            
            try:
                response = await chat_completion(
                    [{"role": "system", "content": "You are OmegA's cognitive synthesis module."},
                     {"role": "user", "content": prompt}],
                    mode="omega"
                )
                
                # Extraction logic (same as reflection)
                json_str = response.strip()
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0].strip()
                data = json.loads(json_str)
                
                # Create and save episode
                from .schemas import Episode, EpisodeType
                episode = Episode(
                    id=f"epi_{uuid.uuid4().hex[:12]}",
                    episode_type=EpisodeType.CONVERSATION,
                    started_at=datetime.utcnow(), # Approximate
                    summary=data["summary"],
                    key_points=data.get("key_points", []),
                    emotional_tone=data.get("emotional_tone", "neutral"),
                    importance_score=data.get("importance", 0.5),
                )
                
                await self.core.memory.save_episode(episode)
                logger.info(f"Dream complete: Episode {episode.id} created from conversation {cid}")
                
            except Exception as e:
                logger.error(f"Failed dream synthesis for {cid}: {e}")

        logger.info("Dream State exit.")
