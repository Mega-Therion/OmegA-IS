/**
 * A2A Protocol Service
 * Implements Google's Agent2Agent protocol for multi-agent communication
 * Spec: https://github.com/a2aproject/A2A
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { randomUUID } = require('crypto');

class AgentToAgentService {

// A2A Task States
const TaskState = {
    SUBMITTED: 'submitted',
    WORKING: 'working',
    INPUT_REQUIRED: 'input-required',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELED: 'canceled'
};

// Map gAIng task status to A2A states
const statusToA2A = {
    'pending': TaskState.SUBMITTED,
    'assigned': TaskState.SUBMITTED,
    'in_progress': TaskState.WORKING,
    'blocked': TaskState.INPUT_REQUIRED,
    'completed': TaskState.COMPLETED,
    'failed': TaskState.FAILED
};

// Map A2A states to gAIng status
const a2aToStatus = {
    [TaskState.SUBMITTED]: 'pending',
    [TaskState.WORKING]: 'in_progress',
    [TaskState.INPUT_REQUIRED]: 'blocked',
    [TaskState.COMPLETED]: 'completed',
    [TaskState.FAILED]: 'failed',
    [TaskState.CANCELED]: 'failed'
};

/**
 * Load Agent Card from file
 */
function getAgentCard() {
    const cardPath = path.join(__dirname, '..', '..', 'public', '.well-known', 'agent.json');
    try {
        const content = fs.readFileSync(cardPath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        console.error('Failed to load Agent Card:', err);
        return null;
    }
}

/**
 * Create A2A-formatted task from gAIng task
 */
function toA2ATask(gaingTask) {
    return {
        id: gaingTask.id,
        sessionId: gaingTask.session_id || gaingTask.id,
        status: {
            state: statusToA2A[gaingTask.status] || TaskState.SUBMITTED,
            timestamp: gaingTask.updated_at || new Date().toISOString()
        },
        metadata: {
            title: gaingTask.title,
            description: gaingTask.description,
            priority: gaingTask.priority,
            complexity: gaingTask.complexity,
            assignedTo: gaingTask.assigned_to,
            createdAt: gaingTask.created_at,
            deadline: gaingTask.deadline
        },
        history: gaingTask.history || []
    };
}

/**
 * Create gAIng task from A2A request
 */
function fromA2ATask(a2aRequest) {
    const params = a2aRequest.params || {};
    return {
        id: params.id || randomUUID(),
        title: params.metadata?.title || params.message?.parts?.[0]?.text?.slice(0, 100) || 'A2A Task',
        description: params.metadata?.description || ',
        instructions: params.message?.parts?.map(p => p.text).join('\n') || ',
        priority: params.metadata?.priority || 5,
        complexity: params.metadata?.complexity || 'medium',
        status: 'pending',
        source: 'a2a',
        requester_agent: a2aRequest.metadata?.sender || 'unknown'
    };
}

/**
 * Create A2A JSON-RPC response
 */
function createResponse(id, result) {
    return {
        jsonrpc: '2.0',
        id: id,
        result: result
    };
}

/**
 * Create A2A JSON-RPC error
 */
function createError(id, code, message, data = null) {
    const response = {
        jsonrpc: '2.0',
        id: id,
        error: {
            code: code,
            message: message
        }
    };
    if (data) {
        response.error.data = data;
    }
    return response;
}

// A2A Error Codes
const ErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    TASK_NOT_FOUND: -32001,
    AGENT_NOT_FOUND: -32002,
    CAPABILITY_NOT_SUPPORTED: -32003
};

/**
 * Create A2A message part
 */
function createMessagePart(type, content) {
    if (type === 'text') {
        return { type: 'text', text: content };
    }
    if (type === 'data') {
        return { type: 'data', mimeType: 'application/json', data: content };
    }
    return { type, content };
}

/**
 * Create A2A artifact (for file outputs, etc.)
 */
function createArtifact(name, mimeType, content) {
    return {
        name: name,
        mimeType: mimeType,
        parts: [createMessagePart('text', content)]
    };
}

module.exports = {
    TaskState,
    ErrorCodes,
    statusToA2A,
    a2aToStatus,
    getAgentCard,
    toA2ATask,
    fromA2ATask,
    createResponse,
    createError,
    createMessagePart,
    createArtifact
};
