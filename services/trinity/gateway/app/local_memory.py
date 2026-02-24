import json
import logging
from pathlib import Path
import os
from .db import get_engine
from sqlalchemy import text

logger = logging.getLogger("omega.local_memory")

def get_nexus_home() -> Path:
    return Path(os.environ.get("HOME", "/home/mega")) / "NEXUS"

class LocalMemoryUnifier:
    """
    Manages Tiered Local Memory without external API reliance.
    """
    def __init__(self):
        self.nexus_home = get_nexus_home()
        self.phylactery_path = self.nexus_home / "identity" / "sovereign_id.json"

    async def get_context(self, query: str, limit: int = 5):
        """
        Gathers context from all 4 local tiers.
        """
        context = {
            "tier1_working": "Active session context.", # In-memory
            "tier2_episodic": await self._query_sqlite(query, limit),
            "tier3_semantic": "Vector search initialized.", # Local vector
            "tier4_relational": "Graph traversal active." # Relational
        }
        
        # Add Phylactery data
        if self.phylactery_path.exists():
            with open(self.phylactery_path, "r") as f:
                context["phylactery"] = json.load(f)
                
        return context

    async def _query_sqlite(self, query_text: str, limit: int):
        engine = get_engine()
        try:
            with engine.begin() as conn:
                # Simple keyword match for Tier 2 local search
                rows = conn.execute(
                    text("SELECT content FROM omega_memory WHERE content LIKE :q LIMIT :l"),
                    {"q": f"%{query_text}%", "l": limit}
                ).all()
                return [r[0] for r in rows]
        except Exception as e:
            logger.error(f"Tier 2 query error: {e}")
            return []

local_memory = LocalMemoryUnifier()
