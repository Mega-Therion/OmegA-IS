"""
API Routes for the Consciousness Core.
"""

from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from .core import get_consciousness
from .schemas import ConsciousnessState, Identity, MemoryQuery, UnifiedMemoryHit

router = APIRouter(prefix="/api/v1/consciousness", tags=["consciousness"])


class SpeakRequest(BaseModel):
    text: str


@router.post("/speak")
async def speak(req: SpeakRequest):
    """
    Synthesize speech using the Consciousness Core's voice (ElevenLabs).
    """
    core = get_consciousness()
    try:
        audio_bytes = await core.voice.generate_audio(req.text)
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ProcessInputRequest(BaseModel):
    user_input: str
    interface: str = "api"
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    conversation_id: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class ProcessInputResponse(BaseModel):
    response: str
    conversation_id: str
    memories_used: List[Dict[str, Any]]
    internal_state: Dict[str, Any]


@router.post("/process", response_model=ProcessInputResponse)
async def process_input(req: ProcessInputRequest):
    """
    Process user input through the Consciousness Core.
    """
    core = get_consciousness()

    if not core._awake:
        # Try to awaken if not already
        await core.awaken()

    result = await core.process_input(
        user_input=req.user_input,
        interface=req.interface,
        user_id=req.user_id,
        user_name=req.user_name,
        conversation_id=req.conversation_id,
        context=req.context,
    )

    return ProcessInputResponse(**result)


@router.get("/state")
async def get_state():
    """Get current consciousness state."""
    core = get_consciousness()
    return await core.get_self_state()


@router.get("/identity")
async def get_identity():
    """Get current identity configuration."""
    core = get_consciousness()
    return core.identity.current.model_dump()


class UpdateMoodRequest(BaseModel):
    mood: str
    reason: Optional[str] = None


@router.post("/mood")
async def update_mood(req: UpdateMoodRequest):
    """Update current mood."""
    core = get_consciousness()
    await core.update_mood(req.mood, req.reason)
    return {"status": "ok", "mood": req.mood}


class GoalRequest(BaseModel):
    goal: str


@router.post("/goals")
async def add_goal(req: GoalRequest):
    """Add a current goal."""
    core = get_consciousness()
    await core.add_goal(req.goal)
    return {"status": "ok", "goals": core.state.current.current_goals}


@router.delete("/goals/{goal}")
async def complete_goal(goal: str):
    """Mark a goal as complete."""
    core = get_consciousness()
    await core.complete_goal(goal)
    return {"status": "ok", "goals": core.state.current.current_goals}


@router.get("/heartbeat/status")
async def heartbeat_status():
    """Get heartbeat daemon status."""
    core = get_consciousness()
    return core.heartbeat.status()
