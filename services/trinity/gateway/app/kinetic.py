import httpx
import logging
import json
import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel
from .config import settings
from .db import get_engine
from sqlalchemy import text

logger = logging.getLogger("omega.kinetic")

class KineticCommand(BaseModel):
    command: str

class TelemetryReading(BaseModel):
    metric: str
    value: float
    unit: str

class KineticBridge:
    """
    Connects the Gateway to the ARK Bus (OmegA-SI Rust Core).
    Records interactions into Kinetic Memory.
    """
    def __init__(self):
        # Default to localhost if not specified, assuming Bridge/Core runs on 8000
        self.core_url = settings.brain_base_url.replace(":8080", ":8000")

    async def get_devices(self) -> List[dict]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self.core_url}/api/devices")
            r.raise_for_status()
            return r.json()

    async def execute_command(self, device_id: str, command: str) -> str:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{self.core_url}/api/devices/{device_id}/command",
                json={"command": command}
            )
            r.raise_for_status()
            result = r.json()
            
            # Record to Kinetic Memory
            await self._record_memory(device_id, command=command, result=result)
            return result

    async def push_telemetry(self, device_id: str, reading: TelemetryReading):
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                f"{self.core_url}/api/devices/{device_id}/telemetry",
                json=reading.dict()
            )
            r.raise_for_status()
            
            # Record to Kinetic Memory
            await self._record_memory(device_id, telemetry=reading.dict())

    async def _record_memory(self, device_id: str, command: Optional[str] = None, telemetry: Optional[dict] = None, result: Optional[str] = None):
        engine = get_engine()
        dialect = engine.dialect.name
        ts_func = "NOW()" if dialect == "postgresql" else "datetime('now')"
        
        telemetry_json = json.dumps(telemetry) if telemetry else None
        meta = json.dumps({"result": result}) if result else "{}"
        
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(f"""
                        INSERT INTO omega_kinetic_memory (id, device_id, ts, command, telemetry, meta)
                        VALUES (:id, :device_id, {ts_func}, :command, :telemetry, :meta)
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "device_id": device_id,
                        "command": command,
                        "telemetry": telemetry_json,
                        "meta": meta
                    }
                )
        except Exception as e:
            logger.error(f"Failed to record kinetic memory: {e}")

kinetic_bridge = KineticBridge()
