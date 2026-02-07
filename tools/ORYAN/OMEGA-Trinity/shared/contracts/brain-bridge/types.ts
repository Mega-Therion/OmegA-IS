/**
 * OMEGA Trinity - Shared API Contract Types
 *
 * TypeScript interfaces for Brain <-> Bridge API communication.
 * These types mirror the Pydantic models defined in packages/bridge/api.py
 *
 * @package @omega-trinity/contracts
 * @version 1.0.0
 */

// =============================================================================
// Health & Status Types
// =============================================================================

/**
 * Health check response from /health endpoint.
 */
export interface HealthResponse {
  readonly status: string;
  readonly service: string;
  readonly timestamp: string;
  readonly version: string;
  readonly components: Record<string, unknown>;
}

/**
 * Readiness probe response from /ready endpoint.
 */
export interface ReadyResponse {
  readonly ready: boolean;
  readonly service: string;
  readonly timestamp: string;
}

/**
 * Liveness probe response from /live endpoint.
 */
export interface LiveResponse {
  readonly alive: boolean;
  readonly service: string;
  readonly timestamp: string;
}

/**
 * Detailed system status from /status endpoint.
 */
export interface SystemStatus {
  readonly service: string;
  readonly version: string;
  readonly uptime: string;
  readonly memory: MemoryStatus;
  readonly orchestrator: {
    readonly active_tasks: number;
    readonly completed_tasks: TaskResult[];
  };
  readonly workers: WorkerPoolStatus;
  readonly consensus: {
    readonly formula: string;
    readonly min_agents: number;
    readonly pending_votes: string[];
    readonly finalized_votes: number;
  };
  readonly timestamp: string;
}

// =============================================================================
// Memory Types
// =============================================================================

/**
 * Memory entry for working memory.
 */
export interface MemoryEntry {
  readonly type: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Session data for session memory.
 */
export interface SessionData {
  readonly session_id: string;
  readonly data: Record<string, unknown>;
}

/**
 * Document for semantic indexing.
 */
export interface DocumentIndex {
  readonly doc_id: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Semantic search request.
 */
export interface SemanticSearchRequest {
  readonly query: string;
  readonly top_k?: number;
}

/**
 * Semantic search result item.
 */
export interface SemanticSearchResultItem {
  readonly doc_id: string;
  readonly content: string;
  readonly score: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Semantic search response.
 */
export interface SemanticSearchResult {
  readonly query: string;
  readonly results: SemanticSearchResultItem[];
  readonly count: number;
}

/**
 * Node creation for relational memory (knowledge graph).
 */
export interface NodeCreate {
  readonly node_id: string;
  readonly node_type: string;
  readonly properties: Record<string, unknown>;
}

/**
 * Relationship creation for relational memory.
 */
export interface RelationshipCreate {
  readonly from_node: string;
  readonly to_node: string;
  readonly rel_type: string;
  readonly properties?: Record<string, unknown>;
}

/**
 * Path query for relational memory.
 */
export interface PathQuery {
  readonly start_node: string;
  readonly end_node: string;
  readonly max_hops?: number;
}

/**
 * Path query result.
 */
export interface PathResult {
  readonly start: string;
  readonly end: string;
  readonly path: string[] | null;
  readonly found: boolean;
}

/**
 * Memory layer status.
 */
export interface MemoryStatus {
  readonly working: {
    readonly size: number;
    readonly budget: number;
    readonly is_full: boolean;
  };
  readonly session: {
    readonly active_sessions: number;
  };
  readonly semantic: {
    readonly indexed_documents: number;
  };
  readonly relational: {
    readonly nodes: number;
    readonly relationships: number;
  };
}

// =============================================================================
// Orchestrator Types
// =============================================================================

/**
 * Objective request for orchestration.
 */
export interface ObjectiveRequest {
  readonly objective: string;
  readonly max_goals?: number;
}

/**
 * Worker assignment request.
 */
export interface WorkerAssignment {
  readonly task_id: string;
  readonly sub_goal_index: number;
  readonly worker_role: string;
}

/**
 * Task status response.
 */
export interface TaskStatus {
  readonly status: 'pending' | 'in_progress' | 'completed' | 'not_found';
  readonly task_id: string;
  readonly objective?: string;
  readonly sub_goals?: string[];
  readonly progress?: number;
  readonly assigned_workers?: Record<number, string>;
}

/**
 * Task result after completion.
 */
export interface TaskResult {
  readonly task_id: string;
  readonly objective: string;
  readonly sub_goals: string[];
  readonly completed_at: string;
}

/**
 * Decomposed task from orchestrator.
 */
export interface DecomposedTask {
  readonly status: string;
  readonly task_id: string;
  readonly objective: string;
  readonly sub_goals: string[];
  readonly created_at: string;
}

// =============================================================================
// Worker Types
// =============================================================================

/**
 * Task assignment to worker pool.
 */
export interface TaskAssignment {
  readonly role: string;
  readonly task_id: string;
  readonly instruction: string;
}

/**
 * Individual worker status.
 */
export interface WorkerStatus {
  readonly worker_id: string;
  readonly role: string;
  readonly status: 'idle' | 'busy' | 'offline';
  readonly current_task?: string;
  readonly tasks_completed: number;
  readonly last_active: string;
}

/**
 * Worker pool status.
 */
export interface WorkerPoolStatus {
  readonly total_workers: number;
  readonly available_workers: number;
  readonly busy_workers: number;
  readonly workers_by_role: Record<string, number>;
  readonly roles: string[];
}

// =============================================================================
// Consensus Types
// =============================================================================

/**
 * Vote types in the DCBFT consensus protocol.
 */
export enum VoteType {
  APPROVE = 'approve',
  REJECT = 'reject',
  ABSTAIN = 'abstain',
}

/**
 * Consensus decision outcomes.
 */
export enum DecisionStatus {
  REACHED = 'consensus_reached',
  FAILED = 'consensus_failed',
  INSUFFICIENT_VOTES = 'insufficient_votes',
  BYZANTINE_DETECTED = 'byzantine_detected',
}

/**
 * Initiate a consensus vote.
 */
export interface VoteInitiate {
  readonly decision_id: string;
  readonly description: string;
  readonly agents: string[];
}

/**
 * Cast a vote in consensus.
 */
export interface VoteCast {
  readonly decision_id: string;
  readonly agent_id: string;
  readonly vote: 'approve' | 'reject' | 'abstain';
  readonly justification?: string;
}

/**
 * Individual vote record.
 */
export interface VoteRecord {
  readonly vote: string;
  readonly justification?: string;
  readonly timestamp: string;
}

/**
 * Vote session details.
 */
export interface VoteSession {
  readonly decision_id: string;
  readonly description: string;
  readonly required_agents: string[];
  readonly votes: Record<string, VoteRecord>;
  readonly quorum_required: number;
  readonly status: 'pending' | 'finalized';
  readonly initiated_at: string;
  readonly finalized_at?: string;
  readonly is_finalized?: boolean;
  readonly final_decision?: ConsensusDecision;
}

/**
 * Consensus decision result.
 */
export interface ConsensusDecision {
  readonly decision_id: string;
  readonly decision: 'approved' | 'rejected';
  readonly consensus_decision: string;
  readonly vote_breakdown: {
    readonly approve: number;
    readonly reject: number;
    readonly abstain: number;
    readonly total: number;
  };
  readonly quorum_required: number;
  readonly quorum_met: boolean;
  readonly consensus_percentage: number;
  readonly finalized_at: string;
}

/**
 * Vote cast confirmation response.
 */
export interface VoteCastResponse {
  readonly decision_id: string;
  readonly agent_id: string;
  readonly vote_recorded: string;
  readonly total_votes: number;
  readonly quorum_required: number;
  readonly status: 'recorded' | 'failed';
  readonly error?: string;
}

/**
 * Consensus engine configuration info.
 */
export interface ConsensusInfo {
  readonly formula: string;
  readonly max_faulty_agents: number;
  readonly min_required_agents: number;
  readonly quorum_percentage: string;
}

// =============================================================================
// Gateway Types
// =============================================================================

/**
 * Chat message format.
 */
export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

/**
 * Chat request for OMEGA Gateway.
 */
export interface ChatRequest {
  readonly messages: ChatMessage[];
  readonly model?: string;
  readonly temperature?: number;
  readonly max_tokens?: number;
}

/**
 * Chat response from OMEGA Gateway.
 */
export interface ChatResponse {
  readonly ok: boolean;
  readonly response?: {
    readonly role: string;
    readonly content: string;
  };
  readonly consensus?: {
    readonly available: boolean;
    readonly min_agents: number;
    readonly pending_decisions: number;
  };
}

/**
 * Remember request for storing memories.
 */
export interface RememberRequest {
  readonly text: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Remember response after storing memory.
 */
export interface RememberResponse {
  readonly status: 'remembered';
  readonly doc_id: string;
  readonly vector_id: string;
}

/**
 * Recall response with retrieved memories.
 */
export interface RecallResponse {
  readonly query: string;
  readonly memories: SemanticSearchResultItem[];
  readonly count: number;
}

// =============================================================================
// Pipeline Types
// =============================================================================

/**
 * Pipeline request (uses ObjectiveRequest).
 */
export type PipelineRequest = ObjectiveRequest;

/**
 * Individual sub-goal result in pipeline.
 */
export interface SubGoalResult {
  readonly sub_goal: string;
  readonly role: string;
  readonly result: Record<string, unknown>;
}

/**
 * Full pipeline execution result.
 */
export interface PipelineResult {
  readonly status: 'completed' | 'failed';
  readonly task_id: string;
  readonly objective: string;
  readonly results: SubGoalResult[];
  readonly memory_status: MemoryStatus;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Standard API error response.
 */
export interface ApiError {
  readonly error: string;
  readonly type: string;
  readonly path: string;
}

/**
 * Operation result with potential error.
 */
export interface OperationResult<T = unknown> {
  readonly status: string;
  readonly error?: string;
  readonly data?: T;
}
