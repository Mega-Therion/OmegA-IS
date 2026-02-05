import asyncio
import logging
from .db import get_engine
from sqlalchemy import text

logger = logging.getLogger("omega.consolidation")

async def run_consolidation_cycle():
    """
    Background loop to prune or summarize old, low-importance memories.
    """
    logger.info("Memory Consolidation background task starting...")
    while True:
        try:
            await consolidate_memories()
        except Exception as e:
            logger.error(f"Consolidation error: {e}")
        
        # Sleep for an hour between cycles
        await asyncio.sleep(3600)

async def consolidate_memories():
    engine = get_engine()
    dialect = engine.dialect.name

    with engine.begin() as conn:
        # Logistic or exponential decay could be used. 
        # Here we do a simple daily 5% decay for memories older than 24h.
        if dialect == "postgresql":
            # Update importance based on age
            conn.execute(text("""
                UPDATE omega_memory 
                SET importance = importance * 0.95
                WHERE ts < NOW() - INTERVAL '1 day' 
                  AND importance > 0.05;
            """))
            # Delete memories that have faded into insignificance
            result = conn.execute(text("DELETE FROM omega_memory WHERE importance <= 0.05;"))
            logger.info(f"Consolidated memories. Pruned {result.rowcount} insignificant items (Postgres).")
        else:
            # SQLite compatible decay
            conn.execute(text("""
                UPDATE omega_memory 
                SET importance = importance * 0.95
                WHERE ts < datetime('now', '-1 day') 
                  AND importance > 0.05;
            """))
            result = conn.execute(text("DELETE FROM omega_memory WHERE importance <= 0.05;"))
            logger.info(f"Consolidated memories. Pruned {result.rowcount} insignificant items (SQLite).")
