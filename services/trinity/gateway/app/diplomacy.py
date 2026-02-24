import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
import os
from typing import Dict, Any, Optional

logger = logging.getLogger("omega.diplomacy")

def get_nexus_home() -> Path:
    return Path(os.environ.get("HOME", "/home/mega")) / "NEXUS"

class DiplomacyBot:
    """
    Automated negotiation, reputation management, and external entity coordination.
    """
    def __init__(self):
        self.reputation_file = get_nexus_home() / "intelligence" / "diplomacy" / "reputation.json"
        self._init_reputation()

    def _init_reputation(self):
        if not self.reputation_file.exists():
            self.reputation_file.parent.mkdir(parents=True, exist_ok=True)
            initial_data = {
                "entities": {
                    "openai": {"score": 0.8, "tier": "silver"},
                    "anthropic": {"score": 0.9, "tier": "gold"},
                    "google": {"score": 0.7, "tier": "bronze"}
                },
                "global_standing": "neutral"
            }
            with open(self.reputation_file, "w") as f:
                json.dump(initial_data, f, indent=2)

    async def get_reputation(self) -> Dict[str, Any]:
        with open(self.reputation_file, "r") as f:
            return json.load(f)

    async def update_reputation(self, entity: str, delta: float):
        data = await self.get_reputation()
        if entity in data["entities"]:
            data["entities"][entity]["score"] = max(0.0, min(1.0, data["entities"][entity]["score"] + delta))
            # Update tier
            score = data["entities"][entity]["score"]
            if score > 0.9: data["entities"][entity]["tier"] = "diamond"
            elif score > 0.7: data["entities"][entity]["tier"] = "gold"
            elif score > 0.5: data["entities"][entity]["tier"] = "silver"
            else: data["entities"][entity]["tier"] = "bronze"
            
            with open(self.reputation_file, "w") as f:
                json.dump(data, f, indent=2)
            logger.info(f"[DIPLOMACY] Reputation updated for {entity}: {score}")

    async def initiate_negotiation(self, provider: str, context: str):
        """
        Simulates a complex negotiation logic.
        """
        reputation = await self.get_reputation()
        standing = reputation["entities"].get(provider, {"score": 0.5})["score"]
        
        negotiation_id = f"NEG_{provider}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        
        # Strategy depends on standing
        strategy = "aggressive" if standing > 0.8 else "conciliatory"
        
        result = {
            "negotiation_id": negotiation_id,
            "provider": provider,
            "strategy": strategy,
            "context": context,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "active",
            "proposed_terms": "15% rebate on volume exceeding 5M tokens" if strategy == "aggressive" else "Standard enterprise tier"
        }
        
        self._log_diplomacy(result)
        return result

    def _log_diplomacy(self, data: dict):
        log_dir = get_nexus_home() / "intelligence" / "diplomacy"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{data['negotiation_id']}.json"
        with open(log_dir / filename, "w") as f:
            json.dump(data, f, indent=2)

diplomacy_bot = DiplomacyBot()
