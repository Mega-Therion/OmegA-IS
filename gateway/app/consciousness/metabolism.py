"""
Metabolism Module for the Consciousness Core.
Manages system resources, energy consumption, and performance monitoring.
"""

from __future__ import annotations
import logging
import psutil
import os
import time
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger("omega.consciousness.metabolism")

class Metabolism:
    """
    Tracks the 'biological' state of the system.
    Monitors CPU, Memory, Disk, and potentially API limits/costs.
    """
    def __init__(self, core):
        self.core = core
        self.process = psutil.Process(os.getpid())
        self._last_cpu_check = time.time()
        self._last_cpu_count = 0.0

    async def check_health(self) -> Dict[str, Any]:
        """Perform a metabolic health check."""
        try:
            # System Metrics
            cpu_usage = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Application Metrics
            app_mem = self.process.memory_info().rss / (1024 * 1024) # MB
            
            health = {
                "cpu_percent": cpu_usage,
                "memory_available_percent": mem.available * 100 / mem.total,
                "disk_free_gb": disk.free / (1024**3),
                "app_memory_mb": app_mem,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Determine "Strain" - high CPU or low memory increases strain
            strain = 0.0
            if cpu_usage > 80: strain += 0.3
            if health["memory_available_percent"] < 10: strain += 0.5
            
            # Update core energy based on strain (high strain drains energy)
            if strain > 0:
                logger.warning(f"Metabolic strain detected: {strain}. Draining energy.")
                await self.core.state.update(
                    energy_level=max(0.1, self.core.state.current.energy_level - (strain * 0.05))
                )
            
            return health
        except Exception as e:
            logger.error(f"Metabolic check failed: {e}")
            return {}

    async def optimize_memory(self):
        """Attempt to clear caches or trigger garbage collection if memory is high."""
        import gc
        logger.info("Triggering metabolic optimization (Garbage Collection)...")
        gc.collect()
        # Further optimization like clearing response caches could be added here
