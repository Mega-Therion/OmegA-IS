from __future__ import annotations
from typing import Any

# Optional adapter: if CollectiveBrain_V1 is available on PYTHONPATH, we can import it.
# If not, gateway falls back to direct LLM call.
#
# Expected modules (based on repo root file list):
# - orchestrator.py
# - worker_pool.py
# - consensus_engine.py
# - memory_layer.py

def try_run_collective_brain(objective: str, context: dict | None = None) -> dict[str, Any] | None:
    context = context or {}
    try:
        from orchestrator import Orchestrator  # type: ignore
    except Exception:
        return None

    try:
        orch = Orchestrator()
        # Best-effort: different versions may expose different methods
        if hasattr(orch, "run"):
            result = orch.run(objective, context=context)  # type: ignore
        elif hasattr(orch, "execute"):
            result = orch.execute(objective, context=context)  # type: ignore
        else:
            result = {"status": "error", "error": "Orchestrator has no run/execute method."}
        return {"mode": "collectivebrain", "result": result}
    except Exception as e:
        return {"mode": "collectivebrain", "error": repr(e)}
