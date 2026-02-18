#!/usr/bin/env python3
"""
OmegA Phase 6 - Peace Pipe Protocol Routes
Package: packages/bridge/routes/consensus.py
Architect: RY (Mega-Therion) | Date: Feb 18, 2026

Implements:
  - POST /consensus/request   : Initiate Peace Pipe Protocol
  - GET  /governance/council/stream/{resolution_id} : SSE live debate stream
  - POST /consensus/veto      : Chief's override / veto
  - GET  /governance/council/resolve : Poll resolution status
"""

import uuid
import asyncio
import json
import os
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, AsyncGenerator

from fastapi import APIRouter, Header, BackgroundTasks, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# Optional Supabase integration
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase: Optional[Client] = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None
except ImportError:
    supabase = None

router = APIRouter(prefix="", tags=["Governance"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ResonanceStakes(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ConsensusRequest(BaseModel):
    intent: str = Field(..., description="The proposed action or decision.")
    impact_scope: List[str] = Field(default=[], description="Modules/data affected.")
    metadata: Optional[dict] = None

class ConsensusResponse(BaseModel):
    status: str
    resolution_id: str
    governance_token: Optional[str] = None
    message: str

class VetoRequest(BaseModel):
    resolution_id: str
    override: bool = True

# ---------------------------------------------------------------------------
# In-memory resolution store (fallback when Supabase not configured)
# ---------------------------------------------------------------------------
_resolutions: dict = {}

# ---------------------------------------------------------------------------
# Background Task: Peace Pipe Protocol
# ---------------------------------------------------------------------------

async def _run_peace_pipe_protocol(resolution_id: str, req: ConsensusRequest):
    """Multi-agent debate simulation. In production, fan out to Claude/Gemini/Codex APIs."""
    agents = ["Claude", "Gemini", "Codex"]
    for lap, agent in enumerate(agents, 1):
        await asyncio.sleep(2)
        lap_entry = {
            "agent": agent,
            "lap": lap,
            "message": f"{agent} analyzing intent: '{req.intent[:80]}...'",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if resolution_id in _resolutions:
            _resolutions[resolution_id]["debate_log"].append(lap_entry)

    # Auto-ratify after debate (RY reviews via HUD/Veto)
    if resolution_id in _resolutions:
        governance_token = f"GT-{uuid.uuid4().hex[:12]}"
        _resolutions[resolution_id]["status"] = "RATIFIED"
        _resolutions[resolution_id]["governance_token"] = governance_token
        # Persist to Supabase
        if supabase:
            try:
                supabase.table("peace_pipe_resolutions").update({
                    "status": "RATIFIED",
                    "governance_token": governance_token,
                    "consensus_summary": f"Council ratified after {len(agents)}-agent debate."
                }).eq("resolution_id", resolution_id).execute()
            except Exception as e:
                print(f"[PPP] Supabase update error: {e}")

    print(f"[PPP] Resolution {resolution_id} RATIFIED")

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/consensus/request", response_model=ConsensusResponse)
async def request_consensus(
    request: ConsensusRequest,
    background_tasks: BackgroundTasks,
    x_resonance_stakes: ResonanceStakes = Header(..., alias="X-Resonance-Stakes")
):
    """Initiate governance decision. HIGH/CRITICAL stakes trigger Peace Pipe Protocol."""
    resolution_id = str(uuid.uuid4())

    _resolutions[resolution_id] = {
        "resolution_id": resolution_id,
        "intent": request.intent,
        "stakes": x_resonance_stakes.value,
        "status": "DEBATING" if x_resonance_stakes in [ResonanceStakes.HIGH, ResonanceStakes.CRITICAL] else "RATIFIED",
        "governance_token": None,
        "debate_log": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # Persist to Supabase
    if supabase:
        try:
            supabase.table("peace_pipe_resolutions").insert({
                "resolution_id": resolution_id,
                "intent": request.intent,
                "stakes": x_resonance_stakes.value,
                "impact_scope": request.impact_scope,
                "status": _resolutions[resolution_id]["status"]
            }).execute()
        except Exception as e:
            print(f"[Consensus] Supabase insert error: {e}")

    if x_resonance_stakes in [ResonanceStakes.HIGH, ResonanceStakes.CRITICAL]:
        background_tasks.add_task(_run_peace_pipe_protocol, resolution_id, request)
        return ConsensusResponse(
            status="COUNCIL_SESSION_INITIATED",
            resolution_id=resolution_id,
            message="Intent requires high-level consensus. Peace Pipe Protocol triggered."
        )

    # Low/Medium: auto-approve
    governance_token = f"GT-{uuid.uuid4().hex[:8]}"
    _resolutions[resolution_id]["governance_token"] = governance_token
    _resolutions[resolution_id]["status"] = "RATIFIED"
    return ConsensusResponse(
        status="APPROVED_BY_BRIDGE",
        resolution_id=resolution_id,
        governance_token=governance_token,
        message="Resonance stakes verified. Intent permitted."
    )


@router.get("/governance/council/resolve")
async def resolve_consensus(resolution_id: str):
    """Poll resolution status. Called by Rust GovernanceGate."""
    res = _resolutions.get(resolution_id)
    if not res:
        # Try Supabase fallback
        if supabase:
            try:
                result = supabase.table("peace_pipe_resolutions").select("*").eq("resolution_id", resolution_id).single().execute()
                if result.data:
                    return result.data
            except Exception:
                pass
        raise HTTPException(status_code=404, detail=f"Resolution {resolution_id} not found")
    return {
        "resolution_id": resolution_id,
        "status": res["status"],
        "governance_token": res.get("governance_token"),
        "consensus_summary": f"Debate log: {len(res['debate_log'])} entries"
    }


async def _sse_debate_generator(resolution_id: str) -> AsyncGenerator[str, None]:
    """Stream real-time debate laps as Server-Sent Events."""
    res = _resolutions.get(resolution_id)
    if not res:
        yield f"data: {json.dumps({'type': 'error', 'payload': {'message': 'Resolution not found'}})}\n\n"
        return

    sent_count = 0
    max_wait = 60  # seconds
    elapsed = 0

    while elapsed < max_wait:
        current_log = res.get("debate_log", [])
        # Send new entries
        while sent_count < len(current_log):
            entry = current_log[sent_count]
            yield f"data: {json.dumps({'type': 'debate_lap', 'payload': entry})}\n\n"
            sent_count += 1

        # Check if resolved
        if res.get("status") in ["RATIFIED", "REJECTED", "VETOED"]:
            yield f"data: {json.dumps({'type': 'resolution_status', 'payload': {'status': res['status'], 'governance_token': res.get('governance_token')}})}\n\n"
            return

        await asyncio.sleep(1)
        elapsed += 1

    yield f"data: {json.dumps({'type': 'resolution_status', 'payload': {'status': 'TIMEOUT'}})}\n\n"


@router.get("/governance/council/stream/{resolution_id}")
async def stream_council_debate(resolution_id: str):
    """SSE endpoint: streams live debate to HUD (Next.js) and TUI (Ratatui)."""
    return StreamingResponse(
        _sse_debate_generator(resolution_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/consensus/veto", response_model=ConsensusResponse)
async def chief_veto(
    request: VetoRequest,
    x_chief_override: str = Header(..., alias="X-Chief-Override")
):
    """Chief's absolute veto. Immediately ratifies any resolution. Requires X-Chief-Override header."""
    if x_chief_override not in ["RY", "MASTER_PILOT", os.getenv("OMEGA_CHIEF_TOKEN", "RY")]:
        raise HTTPException(status_code=403, detail="Invalid Chief Override token")

    resolution_id = request.resolution_id
    governance_token = f"GT-VETO-{uuid.uuid4().hex[:8]}"

    if resolution_id in _resolutions:
        _resolutions[resolution_id]["status"] = "VETOED"
        _resolutions[resolution_id]["governance_token"] = governance_token

    if supabase:
        try:
            supabase.table("peace_pipe_resolutions").update({
                "status": "VETOED",
                "governance_token": governance_token,
                "consensus_summary": "Chief's Veto executed. Immediately ratified."
            }).eq("resolution_id", resolution_id).execute()
        except Exception as e:
            print(f"[Veto] Supabase error: {e}")

    return ConsensusResponse(
        status="VETOED_RATIFIED",
        resolution_id=resolution_id,
        governance_token=governance_token,
        message="Chief's Veto executed. Sovereign action unlocked."
    )
