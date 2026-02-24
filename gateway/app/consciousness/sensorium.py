"""
Sensorium Module for the Consciousness Core.
Handles physical sensory input from the ARK Bus (IoT, Sensors, Robotics).
"""

from __future__ import annotations
import logging
import random
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("omega.consciousness.sensorium")

class Sensorium:
    """
    The sensory interface of OmegA.
    Monitors environmental data, device statuses, and ARK Bus events.
    """
    def __init__(self, core):
        self.core = core
        self.active_sensors = {
            "ARK-TEMP-01": {"type": "temperature", "value": 22.5, "unit": "C"},
            "ARK-LUX-01": {"type": "light", "value": 450, "unit": "lux"},
            "ARK-DRONE-01": {"type": "status", "value": "docked", "battery": 100},
            "ARK-ROBOT-01": {"type": "status", "value": "idle"}
        }

    async def poll_sensors(self) -> Dict[str, Any]:
        """
        Poll all active sensors on the ARK Bus.
        In a production environment, this would call out to the Rust ARK Bus controller.
        """
        # Simulate slight variations
        for sensor in self.active_sensors.values():
            if sensor["type"] == "temperature":
                sensor["value"] += random.uniform(-0.1, 0.1)
            elif sensor["type"] == "light":
                sensor["value"] += random.uniform(-5, 5)
        
        # Check for anomalies
        await self._check_anomalies()
        
        return self.active_sensors

    async def _check_anomalies(self):
        """Detect anomalies that might require cognitive attention."""
        temp = self.active_sensors["ARK-TEMP-01"]["value"]
        if temp > 30.0:
            logger.warning(f"SENSORY ANOMALY: High temperature detected ({temp:.1f}C)")
            await self.core.state.update(mood="concerned")
            await self.core.state.add_goal("Investigate ARK-TEMP-01 heat spike")
        
        status = self.active_sensors["ARK-DRONE-01"]["value"]
        if status == "active":
             await self.core.state.update(focus_topic="Recon Flight Monitoring")

    async def send_command(self, device_id: str, command: str, params: Dict[str, Any] = None):
        """Send a command to a physical entity on the ARK Bus."""
        logger.info(f"ARK BUS COMMAND: Sending '{command}' to {device_id} with {params}")
        # Integration with 'ark_bus_command' host import would happen here
        if device_id in self.active_sensors:
            self.active_sensors[device_id]["value"] = "executing"
            return {"status": "dispatched", "device": device_id}
        return {"status": "error", "message": "Device not found"}
