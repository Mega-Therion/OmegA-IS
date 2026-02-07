/**
 * Worker Pool - OMEGA Core
 * 
 * Specialized worker agents that execute assigned subtasks.
 * Ported from Python bridge/worker_pool.py
 * 
 * Follows the Orchestrator-Worker pattern.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Base worker agent that executes assigned subtasks
 */
class WorkerAgent {
    constructor(role, agentId = null) {
        this.role = role;
        this.agentId = agentId || uuidv4();
        this.taskHistory = [];
        this.currentTask = null;
    }

    /**
     * Execute a subtask assigned by the orchestrator
     */
    executeTask(taskId, instruction) {
        const startTime = new Date().toISOString();

        this.currentTask = {
            task_id: taskId,
            instruction,
            status: 'in_progress',
            started_at: startTime
        };

        // Placeholder: Later route to specific tools/models based on role
        const resultData = `Stub result from ${this.role} agent for: ${instruction}`;

        const result = {
            task_id: taskId,
            agent_id: this.agentId,
            role: this.role,
            instruction,
            result: resultData,
            status: 'completed',
            started_at: startTime,
            completed_at: new Date().toISOString(),
            reflection_token: '[IsRel]' // Reflection token for self-correction
        };

        this.taskHistory.push(result);
        this.currentTask = null;

        return result;
    }

    /**
     * Get current agent status
     */
    getStatus() {
        return {
            agent_id: this.agentId,
            role: this.role,
            current_task: this.currentTask,
            tasks_completed: this.taskHistory.length,
            is_available: this.currentTask === null
        };
    }
}

/**
 * Manages a pool of specialized worker agents
 */
class WorkerPool {
    constructor() {
        this.workers = {};
        this.workerRoles = ['Research', 'Finance', 'Analysis', 'Implementation'];
        // Back-compat alias
        this.worker_roles = this.workerRoles;
        this._initializeWorkers();
    }

    _initializeWorkers() {
        for (const role of this.workerRoles) {
            const worker = new WorkerAgent(role);
            this.workers[worker.agentId] = worker;
        }
    }

    /**
     * Get an available worker by role
     */
    getAvailableWorker(role) {
        for (const worker of Object.values(this.workers)) {
            if (worker.role === role && worker.currentTask === null) {
                return worker;
            }
        }
        return null;
    }

    /**
     * Assign a task to an available worker of the specified role
     */
    assignTask(role, taskId, instruction) {
        const worker = this.getAvailableWorker(role);

        if (!worker) {
            return {
                error: `No available worker for role: ${role}`,
                status: 'failed'
            };
        }

        return worker.executeTask(taskId, instruction);
    }

    /**
     * Get status of all workers in the pool
     */
    getPoolStatus() {
        return {
            total_workers: Object.keys(this.workers).length,
            available_workers: Object.values(this.workers).filter(w => w.currentTask === null).length,
            workers: Object.values(this.workers).map(w => w.getStatus())
        };
    }
}

module.exports = { WorkerAgent, WorkerPool };
