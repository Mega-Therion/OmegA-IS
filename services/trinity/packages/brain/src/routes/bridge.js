/**
 * Bridge Routes - Brain to Bridge Communication Gateway
 *
 * Provides REST endpoints for the HUD and other services to interact
 * with the Bridge consensus layer through the Brain.
 */

const express = require('express');
const router = express.Router();
const bridge = require('../services/bridge-client');

// =============================================================================
// Health & Status
// =============================================================================

/**
 * GET /bridge/health
 * Check Bridge health status
 */
router.get('/health', async (req, res) => {
    try {
        const health = await bridge.getHealth();
        res.json({ ok: true, bridge: health });
    } catch (err) {
        res.json({
            ok: false,
            error: err.message,
            bridge_url: bridge.BRIDGE_URL,
            available: false,
        });
    }
});

/**
 * GET /bridge/status
 * Get detailed Bridge system status
 */
router.get('/status', async (req, res) => {
    try {
        const status = await bridge.getStatus();
        res.json({ ok: true, ...status });
    } catch (err) {
        res.status(503).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/available
 * Quick check if Bridge is available
 */
router.get('/available', async (req, res) => {
    const available = await bridge.isAvailable();
    res.json({ ok: true, available, url: bridge.BRIDGE_URL });
});

// =============================================================================
// Memory Operations
// =============================================================================

/**
 * POST /bridge/memory/working
 * Add entry to working memory
 */
router.post('/memory/working', async (req, res) => {
    try {
        const result = await bridge.memory.addWorking(req.body);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/memory/working
 * Get working memory entries
 */
router.get('/memory/working', async (req, res) => {
    try {
        const count = parseInt(req.query.count) || 10;
        const result = await bridge.memory.getWorking(count);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * DELETE /bridge/memory/working
 * Clear working memory
 */
router.delete('/memory/working', async (req, res) => {
    try {
        const result = await bridge.memory.clearWorking();
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/memory/session
 * Set session data
 */
router.post('/memory/session', async (req, res) => {
    try {
        const { sessionId, data } = req.body;
        if (!sessionId || !data) {
            return res.status(400).json({ ok: false, error: 'sessionId and data required' });
        }
        const result = await bridge.memory.setSession(sessionId, data);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/memory/session/:sessionId
 * Get session data
 */
router.get('/memory/session/:sessionId', async (req, res) => {
    try {
        const result = await bridge.memory.getSession(req.params.sessionId);
        res.json({ ok: true, ...result });
    } catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ ok: false, error: 'Session not found' });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/memory/semantic/index
 * Index document for semantic search
 */
router.post('/memory/semantic/index', async (req, res) => {
    try {
        const { docId, content, metadata } = req.body;
        if (!docId || !content) {
            return res.status(400).json({ ok: false, error: 'docId and content required' });
        }
        const result = await bridge.memory.indexDocument(docId, content, metadata);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/memory/semantic/search
 * Semantic search
 */
router.post('/memory/semantic/search', async (req, res) => {
    try {
        const { query, topK } = req.body;
        if (!query) {
            return res.status(400).json({ ok: false, error: 'query required' });
        }
        const result = await bridge.memory.semanticSearch(query, topK || 5);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/memory/status
 * Get all memory layer status
 */
router.get('/memory/status', async (req, res) => {
    try {
        const status = await bridge.memory.getStatus();
        res.json({ ok: true, ...status });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// =============================================================================
// Orchestrator Operations
// =============================================================================

/**
 * POST /bridge/orchestrate
 * Decompose objective into sub-goals
 */
router.post('/orchestrate', async (req, res) => {
    try {
        const { objective, maxGoals } = req.body;
        if (!objective) {
            return res.status(400).json({ ok: false, error: 'objective required' });
        }
        const result = await bridge.orchestrator.decompose(objective, maxGoals || 5);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/orchestrate/assign
 * Assign sub-goal to worker
 */
router.post('/orchestrate/assign', async (req, res) => {
    try {
        const { taskId, subGoalIndex, workerRole } = req.body;
        if (!taskId || subGoalIndex === undefined || !workerRole) {
            return res.status(400).json({
                ok: false,
                error: 'taskId, subGoalIndex, and workerRole required',
            });
        }
        const result = await bridge.orchestrator.assignToWorker(taskId, subGoalIndex, workerRole);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/orchestrate/task/:taskId
 * Get task status
 */
router.get('/orchestrate/task/:taskId', async (req, res) => {
    try {
        const result = await bridge.orchestrator.getTaskStatus(req.params.taskId);
        res.json({ ok: true, ...result });
    } catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ ok: false, error: 'Task not found' });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/orchestrate/complete/:taskId
 * Mark task as complete
 */
router.post('/orchestrate/complete/:taskId', async (req, res) => {
    try {
        const result = await bridge.orchestrator.markComplete(req.params.taskId);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/orchestrate/tasks
 * List all tasks
 */
router.get('/orchestrate/tasks', async (req, res) => {
    try {
        const result = await bridge.orchestrator.listTasks();
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// =============================================================================
// Worker Pool Operations
// =============================================================================

/**
 * POST /bridge/workers/assign
 * Assign task to worker
 */
router.post('/workers/assign', async (req, res) => {
    try {
        const { role, taskId, instruction } = req.body;
        if (!role || !taskId || !instruction) {
            return res.status(400).json({
                ok: false,
                error: 'role, taskId, and instruction required',
            });
        }
        const result = await bridge.workers.assignTask(role, taskId, instruction);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/workers/status
 * Get all workers status
 */
router.get('/workers/status', async (req, res) => {
    try {
        const result = await bridge.workers.getStatus();
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/workers/roles
 * Get available worker roles
 */
router.get('/workers/roles', async (req, res) => {
    try {
        const result = await bridge.workers.getRoles();
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// =============================================================================
// Consensus (DCBFT) Operations
// =============================================================================

/**
 * POST /bridge/consensus/initiate
 * Initiate a consensus vote
 */
router.post('/consensus/initiate', async (req, res) => {
    try {
        const { decisionId, description, agents } = req.body;
        if (!decisionId || !description || !agents || !Array.isArray(agents)) {
            return res.status(400).json({
                ok: false,
                error: 'decisionId, description, and agents array required',
            });
        }
        const result = await bridge.consensus.initiate(decisionId, description, agents);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/consensus/vote
 * Cast a vote
 */
router.post('/consensus/vote', async (req, res) => {
    try {
        const { decisionId, agentId, vote, justification } = req.body;
        if (!decisionId || !agentId || !vote) {
            return res.status(400).json({
                ok: false,
                error: 'decisionId, agentId, and vote required',
            });
        }
        const result = await bridge.consensus.vote(decisionId, agentId, vote, justification);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/consensus/tally/:decisionId
 * Tally votes
 */
router.post('/consensus/tally/:decisionId', async (req, res) => {
    try {
        const result = await bridge.consensus.tally(req.params.decisionId);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/consensus/decision/:decisionId
 * Get decision status
 */
router.get('/consensus/decision/:decisionId', async (req, res) => {
    try {
        const result = await bridge.consensus.getDecision(req.params.decisionId);
        res.json({ ok: true, ...result });
    } catch (err) {
        if (err.message.includes('not found')) {
            return res.status(404).json({ ok: false, error: 'Decision not found' });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/consensus/pending
 * List pending decisions
 */
router.get('/consensus/pending', async (req, res) => {
    try {
        const result = await bridge.consensus.listPending();
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/consensus/info
 * Get consensus engine info
 */
router.get('/consensus/info', async (req, res) => {
    try {
        const result = await bridge.consensus.getInfo();
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// =============================================================================
// OMEGA Gateway Operations
// =============================================================================

/**
 * POST /bridge/omega/chat
 * Send chat to OMEGA Gateway
 */
router.post('/omega/chat', async (req, res) => {
    try {
        const { messages, model, temperature, maxTokens } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ ok: false, error: 'messages array required' });
        }
        const result = await bridge.omega.chat(messages, { model, temperature, maxTokens });
        res.json(result);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * POST /bridge/omega/remember
 * Store memory in OMEGA
 */
router.post('/omega/remember', async (req, res) => {
    try {
        const { text, metadata } = req.body;
        if (!text) {
            return res.status(400).json({ ok: false, error: 'text required' });
        }
        const result = await bridge.omega.remember(text, metadata);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * GET /bridge/omega/recall
 * Recall memories from OMEGA
 */
router.get('/omega/recall', async (req, res) => {
    try {
        const { query, topK } = req.query;
        if (!query) {
            return res.status(400).json({ ok: false, error: 'query required' });
        }
        const result = await bridge.omega.recall(query, parseInt(topK) || 5);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// =============================================================================
// Pipeline Operations
// =============================================================================

/**
 * POST /bridge/pipeline/execute
 * Execute full orchestration pipeline
 */
router.post('/pipeline/execute', async (req, res) => {
    try {
        const { objective, maxGoals } = req.body;
        if (!objective) {
            return res.status(400).json({ ok: false, error: 'objective required' });
        }
        const result = await bridge.executePipeline(objective, maxGoals || 5);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
