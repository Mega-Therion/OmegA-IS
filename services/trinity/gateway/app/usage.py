import json
import os
import logging
from pathlib import Path

logger = logging.getLogger("uvicorn")

def get_nexus_home() -> Path:
    return Path(os.environ.get("HOME", "/home/mega")) / "NEXUS"

def record_usage(tokens: int):
    """Update the total token usage in NEXUS/intelligence/token_usage.json"""
    usage_dir = get_nexus_home() / "intelligence"
    usage_file = usage_dir / "token_usage.json"
    
    usage_dir.mkdir(parents=True, exist_ok=True)
    
    total_tokens = 0
    if usage_file.exists():
        try:
            with open(usage_file, "r") as f:
                data = json.load(f)
                total_tokens = data.get("total_tokens", 0)
        except Exception as e:
            logger.error(f"Failed to read token usage: {e}")
            
    total_tokens += tokens
    
    try:
        with open(usage_file, "w") as f:
            json.dump({"total_tokens": total_tokens}, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write token usage: {e}")
