"""OMEGA Trinity - Shared Type Definitions for Brain<->Bridge API Contracts

This module defines shared type contracts between the Brain (Node.js) and Bridge (Python)
services. These types are designed to be compatible with both Pydantic and standard Python
type checking.

Usage:
    from contracts.types import HealthResponse, MemoryEntry, VoteType
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, TypedDict


# =============================================================================
# Enums
# =============================================================================

class VoteType(Enum):
    """Types of votes in the DCBFT consensus protocol."""
    APPROVE = "approve"
    REJECT = "reject"
    ABSTAIN = "abstain"


class ConsensusDecision(Enum):
    """Possible consensus outcomes from the DCBFT engine."""
    REACHED = "consensus_reached"
    FAILED = "consensus_failed"
    INSUFFICIENT_VOTES = "insufficient_votes"
    BYZANTINE_DETECTED = "byzantine_detected"


class TaskStatusEnum(Enum):
    """Status values for orchestration tasks."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    NOT_FOUND = "not_found"


class WorkerStatusEnum(Enum):
    """Status values for worker pool workers."""
    IDLE = "idle"
    BUSY = "busy"
    ERROR = "error"
    OFFLINE = "offline"


# =============================================================================
# Health/Status Types
# =============================================================================

class ComponentStatus(TypedDict, total=False):
    """Status of an individual component."""
    status: str
    pending_decisions: int
    finalized_decisions: int
    min_agents: int
    active_tasks: int
    completed_tasks: int


@dataclass
class HealthResponse:
    """Health check response from the Bridge service."""
    status: str
    service: str
    timestamp: str
    version: str
    components: Dict[str, Any]

    @classmethod
    def healthy(cls, components: Dict[str, Any]) -> "HealthResponse":
        """Create a healthy response."""
        return cls(
            status="healthy",
            service="bridge",
            timestamp=datetime.utcnow().isoformat(),
            version="1.0.0",
            components=components,
        )


@dataclass
class ReadyResponse:
    """Readiness probe response."""
    ready: bool
    service: str
    timestamp: str
    components: Optional[Dict[str, bool]] = None


@dataclass
class LiveResponse:
    """Liveness probe response."""
    alive: bool
    service: str
    timestamp: str


@dataclass
class SystemStatus:
    """Detailed system status response."""
    service: str
    version: str
    uptime: str
    memory: Dict[str, Any]
    orchestrator: Dict[str, Any]
    workers: Dict[str, Any]
    consensus: Dict[str, Any]
    timestamp: str


# =============================================================================
# Memory Types
# =============================================================================

@dataclass
class MemoryEntry:
    """Memory entry for working memory operations."""
    type: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class SessionData:
    """Session data for session memory operations."""
    session_id: str
    data: Dict[str, Any]


@dataclass
class DocumentIndex:
    """Document for semantic indexing."""
    doc_id: str
    content: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class SemanticSearchRequest:
    """Request for semantic search."""
    query: str
    top_k: int = 5


@dataclass
class SemanticSearchResult:
    """Result from semantic search."""
    query: str
    results: List[Dict[str, Any]]
    count: int


@dataclass
class NodeCreate:
    """Node creation request for relational memory (knowledge graph)."""
    node_id: str
    node_type: str
    properties: Dict[str, Any]


@dataclass
class RelationshipCreate:
    """Relationship creation request for relational memory."""
    from_node: str
    to_node: str
    rel_type: str
    properties: Optional[Dict[str, Any]] = None


@dataclass
class PathQuery:
    """Path query request for relational memory."""
    start_node: str
    end_node: str
    max_hops: int = 3


@dataclass
class PathQueryResult:
    """Result from a path query."""
    start: str
    end: str
    path: Optional[List[str]]
    found: bool


# =============================================================================
# Orchestrator Types
# =============================================================================

@dataclass
class ObjectiveRequest:
    """Request to decompose an objective into sub-goals."""
    objective: str
    max_goals: int = 5


@dataclass
class WorkerAssignment:
    """Request to assign a sub-goal to a worker."""
    task_id: str
    sub_goal_index: int
    worker_role: str


@dataclass
class TaskStatus:
    """Status of an orchestration task."""
    task_id: str
    status: str
    objective: Optional[str] = None
    sub_goals: Optional[List[str]] = None
    assigned_workers: Optional[Dict[str, str]] = None
    completed_goals: Optional[List[int]] = None
    created_at: Optional[str] = None


@dataclass
class TaskResult:
    """Result of a completed task."""
    task_id: str
    status: str
    objective: str
    results: List[Dict[str, Any]]
    memory_status: Optional[Dict[str, Any]] = None


@dataclass
class DecomposedTask:
    """Result of objective decomposition."""
    task_id: str
    objective: str
    sub_goals: List[str]
    assigned_workers: Dict[str, str]
    status: str
    created_at: str


# =============================================================================
# Worker Types
# =============================================================================

@dataclass
class TaskAssignment:
    """Task assignment to a worker in the pool."""
    role: str
    task_id: str
    instruction: str


@dataclass
class WorkerStatus:
    """Status of an individual worker."""
    worker_id: str
    role: str
    status: str
    current_task: Optional[str] = None
    completed_tasks: int = 0
    last_active: Optional[str] = None


@dataclass
class WorkerPoolStatus:
    """Status of the entire worker pool."""
    total_workers: int
    available_workers: int
    busy_workers: int
    roles: List[str]
    workers: List[Dict[str, Any]]


# =============================================================================
# Consensus Types
# =============================================================================

@dataclass
class VoteInitiate:
    """Request to initiate a DCBFT consensus vote."""
    decision_id: str
    description: str
    agents: List[str]


@dataclass
class VoteCast:
    """Request to cast a vote in consensus."""
    decision_id: str
    agent_id: str
    vote: str  # "approve", "reject", "abstain"
    justification: Optional[str] = None


@dataclass
class VoteRecord:
    """Record of a single vote cast."""
    vote: str
    justification: Optional[str]
    timestamp: str


@dataclass
class VoteSession:
    """Active vote session data."""
    decision_id: str
    description: str
    required_agents: List[str]
    votes: Dict[str, VoteRecord]
    quorum_required: int
    quorum: int
    status: str
    initiated_at: str
    finalized_at: Optional[str] = None


@dataclass
class VoteBreakdown:
    """Breakdown of votes in a consensus decision."""
    approve: int
    reject: int
    abstain: int
    total: int


@dataclass
class DecisionStatus:
    """Status of a consensus decision."""
    decision_id: str
    description: str
    required_agents: List[str]
    votes: Dict[str, Dict[str, Any]]
    quorum_required: int
    status: str
    initiated_at: str
    finalized_at: Optional[str]
    is_finalized: bool
    final_decision: Optional[Dict[str, Any]] = None


@dataclass
class ConsensusResult:
    """Result of a consensus tally."""
    decision_id: str
    decision: str  # "approved", "rejected"
    consensus_decision: str  # ConsensusDecision value
    vote_breakdown: VoteBreakdown
    quorum_required: int
    quorum_met: bool
    consensus_percentage: float
    finalized_at: str


@dataclass
class ConsensusInfo:
    """Consensus engine configuration info."""
    formula: str
    max_faulty_agents: int
    min_required_agents: int
    quorum_percentage: str


# =============================================================================
# Gateway Types
# =============================================================================

class MessageDict(TypedDict):
    """Chat message structure."""
    role: str
    content: str


@dataclass
class ChatRequest:
    """Chat request for OMEGA Gateway."""
    messages: List[Dict[str, str]]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000


@dataclass
class ChatResponseData:
    """Chat response content."""
    role: str
    content: str


@dataclass
class ChatConsensusInfo:
    """Consensus info in chat response."""
    available: bool
    min_agents: int
    pending_decisions: int


@dataclass
class ChatResponse:
    """Chat response from OMEGA Gateway."""
    ok: bool
    response: Optional[Dict[str, Any]]
    consensus: Optional[Dict[str, Any]] = None


@dataclass
class RememberRequest:
    """Request to store a memory."""
    text: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class RememberResponse:
    """Response from storing a memory."""
    status: str
    doc_id: str
    vector_id: str


@dataclass
class RecallResponse:
    """Response from recalling memories."""
    query: str
    memories: List[Dict[str, Any]]
    count: int


# =============================================================================
# Pipeline Types
# =============================================================================

@dataclass
class PipelineRequest:
    """Request to execute a full orchestration pipeline."""
    objective: str
    max_goals: int = 5


@dataclass
class PipelineSubGoalResult:
    """Result of a single sub-goal in the pipeline."""
    sub_goal: str
    role: str
    result: Dict[str, Any]


@dataclass
class PipelineResult:
    """Result of a complete pipeline execution."""
    status: str
    task_id: str
    objective: str
    results: List[PipelineSubGoalResult]
    memory_status: Dict[str, Any]


# =============================================================================
# Error Types
# =============================================================================

@dataclass
class ErrorResponse:
    """Standard error response."""
    error: str
    type: str
    path: str
    status_code: int = 500


@dataclass
class ValidationError:
    """Validation error detail."""
    loc: List[str]
    msg: str
    type: str


@dataclass
class HTTPValidationError:
    """HTTP validation error response (FastAPI format)."""
    detail: List[ValidationError]
