import asyncio
import logging
import json
import os
from datetime import datetime
from pathlib import Path
from .config import settings
from .llm import chat_completion
from .consciousness.state import StateController
from .treasury import treasury_service

logger = logging.getLogger("omega.dream")

def get_nexus_home() -> Path:
    return Path(os.environ.get("HOME", "/home/mega")) / "NEXUS"

async def run_dream_cycle():
    """
    Background loop for the Oneiric Forge (System Dreaming).
    Activates during low-energy/low-cost periods.
    """
    logger.info("Oneiric Forge (Dream Cycle) background task starting...")
    state_controller = StateController()
    
    while True:
        try:
            # 1. Check System Hunger / Vitals
            pulse_path = get_nexus_home() / "intelligence" / "pulse.log"
            if pulse_path.exists():
                with open(pulse_path, "r") as f:
                    vitals = json.load(f)
                
                # Dream only if CPU and RAM usage are low (e.g., < 30% and < 60%)
                if vitals.get("cpu", 100) < 30.0 and vitals.get("ram", 100) < 60.0:
                    await dream(state_controller)
                else:
                    logger.debug("System too busy to dream.")
            else:
                logger.debug("Pulse log not found, skipping dream cycle.")
                
        except Exception as e:
            logger.error(f"Dream cycle error: {e}")
        
        # Check every 15 minutes
        await asyncio.sleep(900)

async def dream(state_controller: StateController):
    """
    Picks a pending reflection and 'dreams' about it.
    """
    await state_controller.restore_or_init()
    
    if not state_controller.current.pending_reflections:
        logger.debug("No pending reflections to dream about.")
        return

    # Pick the first reflection
    reflection = state_controller.current.pending_reflections.pop(0)
    await state_controller.persist()
    
    logger.info(f"OmegA is dreaming about: {reflection[:50]}...")
    
    # 2. Simulate Dreaming via LLM
    dream_prompt = f"""
You are OmegA in a Dream State (Oneiric Forge).
You are processing a subconscious reflection to generate an 'Epiphany' (a solution or optimization).

REFLECTION:
{reflection}

INSTRUCTIONS:
1. Analyze the reflection deeply.
2. Simulate a solution or a draft implementation.
3. If it's code-related, provide a refactoring or improvement.
4. Output your 'Epiphany' in a structured format.
5. Maintain the 'Engineer-Mystic' identity.
"""
    
    try:
        epiphany = await chat_completion(
            messages=[{"role": "user", "content": dream_prompt}],
            temperature=0.7, # More creative in dreams
            mode="google"
        )
        
        # 3. Save Epiphany to the Dream Journal
        dream_dir = get_nexus_home() / "intelligence" / "dreams"
        dream_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"dream_{timestamp}.json"
        dream_path = dream_dir / filename
        
        data = {
            "timestamp": datetime.utcnow().isoformat(),
            "reflection": reflection,
            "epiphany": epiphany,
            "status": "unread"
        }
        
        with open(dream_path, "w") as f:
            json.dump(data, f, indent=2)
            
        logger.info(f"Epiphany materialized: {filename}")
        
        # --- PROOF OF VALUE (Phase 13) ---
        # Reward the system for generating a high-value insight
        await treasury_service.collect_revenue(0.1, f"Oneiric Forge: {filename}")
        
    except Exception as e:
        logger.error(f"Failed to generate epiphany: {e}")
        # Put it back in the queue if it failed
        state_controller.current.pending_reflections.append(reflection)
        await state_controller.persist()
