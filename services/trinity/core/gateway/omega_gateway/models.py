from pydantic import BaseModel
from typing import Any, Dict, Optional

class OmegaEvent(BaseModel):
    id: str
    ts: str
    source: str
    type: str
    payload: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    security: Optional[Dict[str, Any]] = None
    routing: Optional[Dict[str, Any]] = None
