import json
import logging
from datetime import datetime
from pathlib import Path
import os

logger = logging.getLogger("uvicorn")

def get_nexus_home() -> Path:
    return Path(os.environ.get("HOME", "/home/mega")) / "NEXUS"

class SoulSnapshot:
    """
    Captures the psychological state and identity alignment of the system.
    """
    def __init__(self, interaction_text: str, role: str):
        self.timestamp = datetime.utcnow().isoformat()
        self.interaction_text = interaction_text
        self.role = role # Architect or System
        self.alignment_score = 1.0 # Placeholder for alignment logic
        
    def save(self):
        snapshot_dir = get_nexus_home() / "intelligence" / "snapshots"
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"soul_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        snapshot_path = snapshot_dir / filename
        
        data = {
            "timestamp": self.timestamp,
            "role": self.role,
            "interaction_summary": self.interaction_text[:200] + "...",
            "alignment": self.alignment_score,
            "identity": "Engineer-Mystic"
        }
        
        with open(snapshot_path, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Soul Snapshot saved: {filename}")

def take_snapshot(text: str, role: str):
    try:
        snapshot = SoulSnapshot(text, role)
        snapshot.save()
    except Exception as e:
        logger.error(f"Failed to take soul snapshot: {e}")
