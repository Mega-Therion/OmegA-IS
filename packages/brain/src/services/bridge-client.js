/**
 * OMEGA Bridge Client - Brain to Bridge Communication
 *
 * This service provides the interface for Brain to communicate with the
 * Bridge (FastAPI consensus layer) for:
 * - DCBFT consensus operations
 * - Memory layer operations
 * - Task orchestration
 * - Worker coordination
 */

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:8000';

/**
 * Make HTTP request to Bridge API
 */
async function bridgeRequest(endpoint, options = {}) {
    const url = `${BRIDGE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const fetchOptions = { method, headers };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.detail || `Bridge error: ${response.status}`);
        }

        return data;
    } catch (err) {
        console.error(`[Bridge Client] ${method} ${endpoint} failed:`, err.message);
        throw err;
    }
}

// =============================================================================
// Health & Status
// =============================================================================

/**
 * Check Bridge health status
 */
async function getHealth() {
    return bridgeRequest('/health');
}

/**
 * Get detailed Bridge system status
 */
async function getStatus() {
    return bridgeRequest('/status');
}

/**
 * Check if Bridge is available
 */
async function isAvailable() {
    try {
        await getHealth();
        return true;
    } catch {
        return false;
    }
}

// =============================================================================
// Memory Layer Operations
// =============================================================================

const memory = {
    /**
     * Add entry to working memory
     */
    async addWorking(entry) {
        return bridgeRequest('/memory/working', {
            method: 'POST',
            body: entry,
        });
    },

    /**
     * Get recent working memory entries
     */
    async getWorking(count = 10) {
        return bridgeRequest(`/memory/working?count=${count}`);
    },

    /**
     * Clear working memory
     */
    async clearWorking() {
        return bridgeRequest('/memory/working', { method: 'DELETE' });
    },

    /**
     * Set session data
     */
    async setSession(sessionId, data) {
        return bridgeRequest('/memory/session', {
            method: 'POST',
            body: { session_id: sessionId, data },
        });
    },

    /**
     * Get session data
     */
    async getSession(sessionId) {
        return bridgeRequest(`/memory/session/${sessionId}`);
    },

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        return bridgeRequest(`/memory/session/${sessionId}`, { method: 'DELETE' });
    },

    /**
     * Index document for semantic search
     */
    async indexDocument(docId, content, metadata = {}) {
        return bridgeRequest('/memory/semantic/index', {
            method: 'POST',
            body: { doc_id: docId, content, metadata },
        });
    },

    /**
     * Semantic search
     */
    async semanticSearch(query, topK = 5) {
        return bridgeRequest('/memory/semantic/search', {
            method: 'POST',
            body: { query, top_k: topK },
        });
    },

    /**
     * Create knowledge graph node
     */
    async createNode(nodeId, nodeType, properties) {
        return bridgeRequest('/memory/relational/node', {
            method: 'POST',
            body: { node_id: nodeId, node_type: nodeType, properties },
        });
    },

    /**
     * Get knowledge graph node
     */
    async getNode(nodeId) {
        return bridgeRequest(`/memory/relational/node/${nodeId}`);
    },

    /**
     * Create relationship between nodes
     */
    async createRelationship(fromNode, toNode, relType, properties = {}) {
        return bridgeRequest('/memory/relational/relationship', {
            method: 'POST',
            body: {
                from_node: fromNode,
                to_node: toNode,
                rel_type: relType,
                properties,
            },
        });
    },

    /**
     * Find path between nodes
     */
    async findPath(startNode, endNode, maxHops = 3) {
        return bridgeRequest('/memory/relational/path', {
            method: 'POST',
            body: { start_node: startNode, end_node: endNode, max_hops: maxHops },
        });
    },

    /**
     * Get memory layer status
     */
    async getStatus() {
        return bridgeRequest('/memory/status');
    },
};

// =============================================================================
// Orchestrator Operations
// =============================================================================

const orchestrator = {
    /**
     * Decompose objective into sub-goals
     */
    async decompose(objective, maxGoals = 5) {
        return bridgeRequest('/orchestrate', {
            method: 'POST',
            body: { objective, max_goals: maxGoals },
        });
    },

    /**
     * Assign sub-goal to worker
     */
    async assignToWorker(taskId, subGoalIndex, workerRole) {
        return bridgeRequest('/orchestrate/assign', {
            method: 'POST',
            body: {
                task_id: taskId,
                sub_goal_index: subGoalIndex,
                worker_role: workerRole,
            },
        });
    },

    /**
     * Get task status
     */
    async getTaskStatus(taskId) {
        return bridgeRequest(`/orchestrate/task/${taskId}`);
    },

    /**
     * Mark task as complete
     */
    async markComplete(taskId) {
        return bridgeRequest(`/orchestrate/complete/${taskId}`, { method: 'POST' });
    },

    /**
     * List all tasks
     */
    async listTasks() {
        return bridgeRequest('/orchestrate/tasks');
    },
};

// =============================================================================
// Worker Pool Operations
// =============================================================================

const workers = {
    /**
     * Assign task to worker by role
     */
    async assignTask(role, taskId, instruction) {
        return bridgeRequest('/workers/assign', {
            method: 'POST',
            body: { role, task_id: taskId, instruction },
        });
    },

    /**
     * Get all workers status
     */
    async getStatus() {
        return bridgeRequest('/workers/status');
    },

    /**
     * Check if worker is available
     */
    async getAvailable(role) {
        return bridgeRequest(`/workers/available/${role}`);
    },

    /**
     * Get available worker roles
     */
    async getRoles() {
        return bridgeRequest('/workers/roles');
    },
};

// =============================================================================
// Consensus (DCBFT) Operations
// =============================================================================

const consensus = {
    /**
     * Initiate a consensus vote
     */
    async initiate(decisionId, description, agents) {
        return bridgeRequest('/consensus/initiate', {
            method: 'POST',
            body: { decision_id: decisionId, description, agents },
        });
    },

    /**
     * Cast a vote
     */
    async vote(decisionId, agentId, vote, justification = null) {
        return bridgeRequest('/consensus/vote', {
            method: 'POST',
            body: {
                decision_id: decisionId,
                agent_id: agentId,
                vote,
                justification,
            },
        });
    },

    /**
     * Tally votes for a decision
     */
    async tally(decisionId) {
        return bridgeRequest(`/consensus/tally/${decisionId}`, { method: 'POST' });
    },

    /**
     * Get decision status
     */
    async getDecision(decisionId) {
        return bridgeRequest(`/consensus/decision/${decisionId}`);
    },

    /**
     * List pending decisions
     */
    async listPending() {
        return bridgeRequest('/consensus/pending');
    },

    /**
     * List finalized decisions
     */
    async listFinalized() {
        return bridgeRequest('/consensus/finalized');
    },

    /**
     * Get consensus engine info
     */
    async getInfo() {
        return bridgeRequest('/consensus/info');
    },
};

// =============================================================================
// OMEGA Gateway Operations
// =============================================================================

const omega = {
    /**
     * Send chat to OMEGA Gateway
     */
    async chat(messages, options = {}) {
        return bridgeRequest('/omega/chat', {
            method: 'POST',
            body: {
                messages,
                model: options.model,
                temperature: options.temperature,
                max_tokens: options.maxTokens,
            },
        });
    },

    /**
     * Store a memory in OMEGA
     */
    async remember(text, metadata = {}) {
        return bridgeRequest('/omega/remember', {
            method: 'POST',
            body: { text, metadata },
        });
    },

    /**
     * Recall memories from OMEGA
     */
    async recall(query, topK = 5) {
        return bridgeRequest(`/omega/recall?query=${encodeURIComponent(query)}&top_k=${topK}`);
    },
};

// =============================================================================
// Pipeline Operations
// =============================================================================

/**
 * Execute full orchestration pipeline
 */
async function executePipeline(objective, maxGoals = 5) {
    return bridgeRequest('/pipeline/execute', {
        method: 'POST',
        body: { objective, max_goals: maxGoals },
    });
}

// =============================================================================
// Exports
// =============================================================================

module.exports = {
    // Core
    BRIDGE_URL,
    bridgeRequest,

    // Health
    getHealth,
    getStatus,
    isAvailable,

    // Namespaced operations
    memory,
    orchestrator,
    workers,
    consensus,
    omega,

    // Pipeline
    executePipeline,
};
