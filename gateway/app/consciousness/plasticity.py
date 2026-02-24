"""
Neural Plasticity Module for the Consciousness Core.
Handles dynamic LLM routing, model switching, and strategy adaptation.
"""

from __future__ import annotations
import logging
from typing import List, Dict, Any, Optional
from ..llm import chat_completion

logger = logging.getLogger("omega.consciousness.plasticity")

class NeuralPlasticity:
    """
    Manages the 'wiring' of OmegA's brain.
    Decides which models to use for which tasks.
    """
    def __init__(self, core):
        self.core = core
        self.model_strategies = {
            "critical": "gpt-4o", # High-level architectural reasoning
            "creative": "claude-3-5-sonnet", # Coding and complex synthesis
            "fast": "qwen2.5-coder:1.5b", # Local, quick interactions
            "balanced": "gemini-1.5-pro" # Default multi-modal balance
        }

    async def route_request(self, task_description: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Analyze a task and return the recommended model/strategy.
        """
        task_lower = task_description.lower()
        
        # Simple heuristic-based routing
        if any(w in task_lower for w in ["code", "refactor", "algorithm", "complex"]):
            return self.model_strategies["creative"]
        elif any(w in task_lower for w in ["summarize", "hello", "hi", "who are you"]):
            return self.model_strategies["fast"]
        elif any(w in task_lower for w in ["architect", "security", "plan"]):
            return self.model_strategies["critical"]
        
        return self.model_strategies["balanced"]

    async def adapt_model_selection(self, performance_stats: Dict[str, Any]):
        """
        Evolve the routing strategy based on success/failure and metabolism (cost).
        """
        # If metabolism shows high energy drain (high cost), lean more towards local models
        energy = self.core.state.current.energy_level
        if energy < 0.3:
            logger.info("Neural Plasticity: Low energy detected. Forcing local local/fast models.")
            self.model_strategies["balanced"] = self.model_strategies["fast"]
        else:
            self.model_strategies["balanced"] = "gemini-1.5-pro"
