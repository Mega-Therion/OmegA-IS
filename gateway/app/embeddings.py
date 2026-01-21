from __future__ import annotations
import httpx
import logging
from .config import settings

logger = logging.getLogger("uvicorn")

# Default to text-embedding-3-small dims=1536
DEFAULT_CLOUD_EMBED_MODEL = "text-embedding-3-small"
DEFAULT_LOCAL_EMBED_MODEL = "nomic-embed-text" 

async def embed(texts: list[str], mode: str | None = None) -> list[list[float]]:
    """
    Generates embeddings using either Local or Cloud provider.
    """
    target_mode = mode or settings.default_ai_mode

    if target_mode == "cloud":
        if not settings.omega_openai_api_key:
            # Fallback to zero vectors if key missing
            return [[0.0] * 1536 for _ in texts]
            
        base_url = settings.omega_openai_base_url.rstrip("/") + "/embeddings"
        api_key = settings.omega_openai_api_key
        model = DEFAULT_CLOUD_EMBED_MODEL
        
    else: # local
        # Assumes Ollama v1 compatibility
        base_url = settings.omega_local_base_url.rstrip("/") + "/embeddings"
        api_key = "ollama"
        model = DEFAULT_LOCAL_EMBED_MODEL

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {"model": model, "input": texts}
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(base_url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            return [d["embedding"] for d in data["data"]]
            
    except Exception as e:
        logger.error(f"Embedding Error ({target_mode}): {e}")
        # Return zero vectors on failure to prevent crash
        # Note: Local embeddings might have different dimensions than 1536!
        # This is a potential issue if mixing models in the same DB column.
        # For now, we return 1536 zeros as a safe fallback for the default schema.
        return [[0.0] * 1536 for _ in texts]