#!/usr/bin/env python3
"""OMEGA Bridge - FastAPI REST API Server

Provides HTTP endpoints for the consensus engine, memory layer, orchestrator, and worker pool.
This is the consensus layer of the OMEGA Trinity architecture.

Usage:
    uvicorn api:app --host 0.0.0.0 --port 8000 --reload

    # Or directly:
    python api.py
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from consensus_engine import DCBFTEngine, VoteType, ConsensusDecision
from memory_layer import UnifiedMemoryLayer
from orchestrator import Orchestrator
from worker_pool import WorkerPool

# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="OMEGA Bridge",
    description="Consensus layer for the OMEGA Trinity - DCBFT consensus, memory orchestration, and worker coordination",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware for HUD and Brain communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# Global State (in production, use Redis/database)
# =============================================================================

# Initialize core components
memory = UnifiedMemoryLayer(working_budget=50)
orchestrator = Orchestrator()
worker_pool = WorkerPool()
consensus_engine = DCBFTEngine(max_faulty_agents=1)

# Track active sessions
active_sessions: Dict[str, Dict] = {}


# =============================================================================
# Pydantic Models
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str = "bridge"
    timestamp: str
    version: str = "1.0.0"
    components: Dict[str, Any]


class MemoryEntry(BaseModel):
    """Memory entry for working memory."""
    type: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class SessionData(BaseModel):
    """Session data for session memory."""
    session_id: str
    data: Dict[str, Any]


class DocumentIndex(BaseModel):
    """Document for semantic indexing."""
    doc_id: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


class SemanticSearchRequest(BaseModel):
    """Semantic search request."""
    query: str
    top_k: int = 5


class NodeCreate(BaseModel):
    """Node creation for relational memory."""
    node_id: str
    node_type: str
    properties: Dict[str, Any]


class RelationshipCreate(BaseModel):
    """Relationship creation for relational memory."""
    from_node: str
    to_node: str
    rel_type: str
    properties: Optional[Dict[str, Any]] = None


class PathQuery(BaseModel):
    """Path query for relational memory."""
    start_node: str
    end_node: str
    max_hops: int = 3


class ObjectiveRequest(BaseModel):
    """Objective for orchestration."""
    objective: str
    max_goals: int = 5


class WorkerAssignment(BaseModel):
    """Worker assignment request."""
    task_id: str
    sub_goal_index: int
    worker_role: str


class TaskAssignment(BaseModel):
    """Task assignment to worker pool."""
    role: str
    task_id: str
    instruction: str


class VoteInitiate(BaseModel):
    """Initiate a consensus vote."""
    decision_id: str
    description: str
    agents: List[str]


class VoteCast(BaseModel):
    """Cast a vote in consensus."""
    decision_id: str
    agent_id: str
    vote: str  # "approve", "reject", "abstain"
    justification: Optional[str] = None


class ChatRequest(BaseModel):
    """Chat request for OMEGA Gateway."""
    messages: List[Dict[str, str]]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000


class ChatResponse(BaseModel):
    """Chat response from OMEGA Gateway."""
    ok: bool
    response: Optional[Dict[str, Any]]
    consensus: Optional[Dict[str, Any]] = None


# =============================================================================
# Health & Status Endpoints
# =============================================================================

@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        components={
            "consensus_engine": {
                "status": "operational",
                "pending_decisions": len(consensus_engine.pending_decisions),
                "finalized_decisions": len(consensus_engine.finalized_decisions),
                "min_agents": consensus_engine.min_required_agents,
            },
            "memory_layer": memory.get_status(),
            "orchestrator": {
                "active_tasks": len(orchestrator.active_tasks),
                "completed_tasks": len(orchestrator.completed_tasks),
            },
            "worker_pool": worker_pool.get_pool_status(),
        }
    )


@app.get("/status", tags=["Health"])
async def system_status():
    """Detailed system status."""
    return {
        "service": "OMEGA Bridge",
        "version": "1.0.0",
        "uptime": "N/A",  # Would track actual uptime in production
        "memory": memory.get_status(),
        "orchestrator": {
            "active_tasks": len(orchestrator.active_tasks),
            "completed_tasks": orchestrator.completed_tasks[:10],  # Last 10
        },
        "workers": worker_pool.get_pool_status(),
        "consensus": {
            "formula": f"N >= 3f+1 (f={consensus_engine.max_faulty_agents})",
            "min_agents": consensus_engine.min_required_agents,
            "pending_votes": list(consensus_engine.pending_decisions.keys()),
            "finalized_votes": len(consensus_engine.finalized_decisions),
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# Memory Layer Endpoints
# =============================================================================

# --- Working Memory ---

@app.post("/memory/working", tags=["Memory"])
async def add_working_memory(entry: MemoryEntry):
    """Add entry to working memory."""
    memory.working.add_entry({
        "type": entry.type,
        "content": entry.content,
        "metadata": entry.metadata or {},
    })
    return {
        "status": "stored",
        "size": memory.working.get_size(),
        "budget": memory.working.budget,
    }


@app.get("/memory/working", tags=["Memory"])
async def get_working_memory(count: int = 10):
    """Get recent entries from working memory."""
    return {
        "entries": memory.working.get_recent(count),
        "size": memory.working.get_size(),
        "budget": memory.working.budget,
        "is_full": memory.working.is_full(),
    }


@app.delete("/memory/working", tags=["Memory"])
async def clear_working_memory():
    """Clear working memory."""
    memory.working.clear()
    return {"status": "cleared"}


# --- Session Memory ---

@app.post("/memory/session", tags=["Memory"])
async def set_session(session: SessionData):
    """Set session data."""
    memory.session.set_session(session.session_id, session.data)
    return {"status": "stored", "session_id": session.session_id}


@app.get("/memory/session/{session_id}", tags=["Memory"])
async def get_session(session_id: str):
    """Get session data."""
    data = memory.session.get_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "data": data}


@app.delete("/memory/session/{session_id}", tags=["Memory"])
async def delete_session(session_id: str):
    """Delete session data."""
    if memory.session.delete_session(session_id):
        return {"status": "deleted", "session_id": session_id}
    raise HTTPException(status_code=404, detail="Session not found")


# --- Semantic Memory ---

@app.post("/memory/semantic/index", tags=["Memory"])
async def index_document(doc: DocumentIndex):
    """Index a document for semantic search."""
    vector_id = memory.semantic.index_document(
        doc.doc_id,
        doc.content,
        doc.metadata
    )
    return {
        "status": "indexed",
        "vector_id": vector_id,
        "doc_id": doc.doc_id,
    }


@app.post("/memory/semantic/search", tags=["Memory"])
async def semantic_search(request: SemanticSearchRequest):
    """Perform semantic search."""
    results = memory.semantic.semantic_search(request.query, request.top_k)
    return {
        "query": request.query,
        "results": results,
        "count": len(results),
    }


@app.get("/memory/semantic/{vector_id}", tags=["Memory"])
async def get_document(vector_id: str):
    """Get document by vector ID."""
    doc = memory.semantic.get_document(vector_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# --- Relational Memory ---

@app.post("/memory/relational/node", tags=["Memory"])
async def create_node(node: NodeCreate):
    """Create a node in the knowledge graph."""
    memory.relational.create_node(
        node.node_id,
        node.node_type,
        node.properties
    )
    return {
        "status": "created",
        "node_id": node.node_id,
        "node_type": node.node_type,
    }


@app.get("/memory/relational/node/{node_id}", tags=["Memory"])
async def get_node(node_id: str):
    """Get a node from the knowledge graph."""
    node = memory.relational.get_node(node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return {"node_id": node_id, **node}


@app.post("/memory/relational/relationship", tags=["Memory"])
async def create_relationship(rel: RelationshipCreate):
    """Create a relationship between nodes."""
    memory.relational.create_relationship(
        rel.from_node,
        rel.to_node,
        rel.rel_type,
        rel.properties
    )
    return {
        "status": "created",
        "from": rel.from_node,
        "to": rel.to_node,
        "type": rel.rel_type,
    }


@app.post("/memory/relational/path", tags=["Memory"])
async def find_path(query: PathQuery):
    """Find path between two nodes."""
    path = memory.relational.find_path(
        query.start_node,
        query.end_node,
        query.max_hops
    )
    return {
        "start": query.start_node,
        "end": query.end_node,
        "path": path,
        "found": path is not None,
    }


@app.get("/memory/status", tags=["Memory"])
async def memory_status():
    """Get status of all memory layers."""
    return memory.get_status()


# =============================================================================
# Orchestrator Endpoints
# =============================================================================

@app.post("/orchestrate", tags=["Orchestrator"])
async def decompose_objective(request: ObjectiveRequest):
    """Decompose an objective into sub-goals."""
    task = orchestrator.decompose_objective(
        request.objective,
        request.max_goals
    )
    return {
        "status": "decomposed",
        **task
    }


@app.post("/orchestrate/assign", tags=["Orchestrator"])
async def assign_to_worker(assignment: WorkerAssignment):
    """Assign a sub-goal to a worker."""
    try:
        result = orchestrator.assign_to_worker(
            assignment.task_id,
            assignment.sub_goal_index,
            assignment.worker_role
        )
        return {"status": "assigned", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/orchestrate/task/{task_id}", tags=["Orchestrator"])
async def get_task_status(task_id: str):
    """Get status of a task."""
    status = orchestrator.get_task_status(task_id)
    if status["status"] == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    return status


@app.post("/orchestrate/complete/{task_id}", tags=["Orchestrator"])
async def mark_task_complete(task_id: str):
    """Mark a task as complete."""
    if orchestrator.mark_complete(task_id):
        return {"status": "completed", "task_id": task_id}
    raise HTTPException(status_code=404, detail="Task not found")


@app.get("/orchestrate/tasks", tags=["Orchestrator"])
async def list_tasks():
    """List all active tasks."""
    return {
        "active_tasks": list(orchestrator.active_tasks.values()),
        "completed_count": len(orchestrator.completed_tasks),
    }


# =============================================================================
# Worker Pool Endpoints
# =============================================================================

@app.post("/workers/assign", tags=["Workers"])
async def assign_task_to_worker(assignment: TaskAssignment):
    """Assign a task to an available worker."""
    result = worker_pool.assign_task(
        assignment.role,
        assignment.task_id,
        assignment.instruction
    )
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result


@app.get("/workers/status", tags=["Workers"])
async def workers_status():
    """Get status of all workers."""
    return worker_pool.get_pool_status()


@app.get("/workers/available/{role}", tags=["Workers"])
async def get_available_worker(role: str):
    """Get an available worker by role."""
    worker = worker_pool.get_available_worker(role)
    if worker:
        return worker.get_status()
    raise HTTPException(
        status_code=503,
        detail=f"No available worker for role: {role}"
    )


@app.get("/workers/roles", tags=["Workers"])
async def list_worker_roles():
    """List available worker roles."""
    return {"roles": worker_pool.worker_roles}


# =============================================================================
# Consensus Engine Endpoints
# =============================================================================

@app.post("/consensus/initiate", tags=["Consensus"])
async def initiate_vote(vote_request: VoteInitiate):
    """Initiate a DCBFT consensus vote."""
    result = consensus_engine.initiate_vote(
        vote_request.decision_id,
        vote_request.description,
        vote_request.agents
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {
        "status": "initiated",
        **result
    }


@app.post("/consensus/vote", tags=["Consensus"])
async def cast_vote(vote: VoteCast):
    """Cast a vote on a pending decision."""
    # Map string to VoteType enum
    vote_map = {
        "approve": VoteType.APPROVE,
        "reject": VoteType.REJECT,
        "abstain": VoteType.ABSTAIN,
    }

    vote_type = vote_map.get(vote.vote.lower())
    if not vote_type:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid vote type. Must be one of: {list(vote_map.keys())}"
        )

    result = consensus_engine.cast_vote(
        vote.decision_id,
        vote.agent_id,
        vote_type,
        vote.justification
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@app.post("/consensus/tally/{decision_id}", tags=["Consensus"])
async def tally_votes(decision_id: str):
    """Tally votes and determine consensus."""
    result = consensus_engine.tally_votes(decision_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@app.get("/consensus/decision/{decision_id}", tags=["Consensus"])
async def get_decision_status(decision_id: str):
    """Get status of a decision."""
    status = consensus_engine.get_decision_status(decision_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Decision not found")
    return status


@app.get("/consensus/pending", tags=["Consensus"])
async def list_pending_decisions():
    """List all pending consensus decisions."""
    return {
        "pending": list(consensus_engine.pending_decisions.values()),
        "count": len(consensus_engine.pending_decisions),
    }


@app.get("/consensus/finalized", tags=["Consensus"])
async def list_finalized_decisions():
    """List all finalized consensus decisions."""
    return {
        "finalized": list(consensus_engine.finalized_decisions.values()),
        "count": len(consensus_engine.finalized_decisions),
    }


@app.get("/consensus/info", tags=["Consensus"])
async def consensus_info():
    """Get consensus engine configuration."""
    return {
        "formula": "N >= 3f + 1",
        "max_faulty_agents": consensus_engine.max_faulty_agents,
        "min_required_agents": consensus_engine.min_required_agents,
        "quorum_percentage": "~66% (super-majority)",
    }


# =============================================================================
# OMEGA Gateway Endpoints (for Brain integration)
# =============================================================================

@app.post("/omega/chat", tags=["OMEGA Gateway"])
async def omega_chat(request: ChatRequest):
    """
    OMEGA Gateway chat endpoint.

    In production, this would:
    1. Route to appropriate LLM provider
    2. Apply DCBFT consensus for high-impact decisions
    3. Store conversation in memory layer
    """
    # Generate session ID
    session_id = str(uuid.uuid4())

    # Store in working memory
    memory.working.add_entry({
        "type": "chat_request",
        "session_id": session_id,
        "messages": request.messages,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Placeholder response (in production, call actual LLM)
    response_content = f"OMEGA Bridge received {len(request.messages)} messages. " \
                       f"Consensus engine operational with {consensus_engine.min_required_agents} " \
                       f"minimum agents required for Byzantine fault tolerance."

    return ChatResponse(
        ok=True,
        response={
            "role": "assistant",
            "content": response_content,
        },
        consensus={
            "available": True,
            "min_agents": consensus_engine.min_required_agents,
            "pending_decisions": len(consensus_engine.pending_decisions),
        }
    )


@app.post("/omega/remember", tags=["OMEGA Gateway"])
async def omega_remember(text: str, metadata: Optional[Dict[str, Any]] = None):
    """Store a memory in the OMEGA system."""
    # Index in semantic memory
    doc_id = f"mem_{uuid.uuid4()}"
    vector_id = memory.semantic.index_document(doc_id, text, metadata)

    # Also add to working memory
    memory.working.add_entry({
        "type": "memory_store",
        "doc_id": doc_id,
        "vector_id": vector_id,
        "content": text,
        "metadata": metadata,
    })

    return {
        "status": "remembered",
        "doc_id": doc_id,
        "vector_id": vector_id,
    }


@app.get("/omega/recall", tags=["OMEGA Gateway"])
async def omega_recall(query: str, top_k: int = 5):
    """Recall memories from the OMEGA system."""
    results = memory.semantic.semantic_search(query, top_k)
    return {
        "query": query,
        "memories": results,
        "count": len(results),
    }


# =============================================================================
# Full Orchestration Pipeline (combines all components)
# =============================================================================

@app.post("/pipeline/execute", tags=["Pipeline"])
async def execute_pipeline(request: ObjectiveRequest):
    """
    Execute a full orchestration pipeline:
    1. Decompose objective into sub-goals
    2. Assign to workers
    3. Execute and collect results
    4. Store in memory
    """
    # 1. Decompose
    task = orchestrator.decompose_objective(request.objective, request.max_goals)
    task_id = task["task_id"]

    # 2. Assign and execute each sub-goal
    results = []
    for i, goal in enumerate(task["sub_goals"]):
        role = worker_pool.worker_roles[i % len(worker_pool.worker_roles)]
        result = worker_pool.assign_task(role, task_id, goal)

        # 3. Store in memory
        memory.working.add_entry({
            "type": "task_result",
            "task_id": task_id,
            "sub_goal": goal,
            "result": result,
        })

        results.append({
            "sub_goal": goal,
            "role": role,
            "result": result,
        })

    # 4. Mark complete
    orchestrator.mark_complete(task_id)

    return {
        "status": "completed",
        "task_id": task_id,
        "objective": request.objective,
        "results": results,
        "memory_status": memory.get_status(),
    }


# =============================================================================
# Error Handlers
# =============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "error": str(exc),
            "type": type(exc).__name__,
            "path": str(request.url.path),
        }
    )


# =============================================================================
# Startup/Shutdown Events
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize components on startup."""
    print("=" * 50)
    print("OMEGA Bridge - Consensus Layer Starting")
    print("=" * 50)
    print(f"DCBFT Engine: N >= 3f+1 (min agents: {consensus_engine.min_required_agents})")
    print(f"Memory Budget: {memory.working.budget} entries")
    print(f"Worker Roles: {', '.join(worker_pool.worker_roles)}")
    print("=" * 50)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("OMEGA Bridge shutting down...")


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")

    print(f"Starting OMEGA Bridge on {host}:{port}")
    uvicorn.run(app, host=host, port=port, reload=True)
