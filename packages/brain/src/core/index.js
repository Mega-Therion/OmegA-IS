const { DCBFTEngine, VoteType, ConsensusDecision } = require('./consensus-engine');
const { WorkingMemory, SessionMemory, SemanticMemory, RelationalMemory, UnifiedMemoryLayer } = require('./memory-layer');
const { WorkerAgent, WorkerPool } = require('./worker-pool');
const { LLMClient, PROVIDERS, decomposeWithLLM, fallbackDecomposition } = require('./llm-client');
const { NeuroCreditSystem, getNeuroCreditSystem, TransactionType, COSTS, EARNINGS } = require('./neuro-credits');
const { DayJobsSystem, getDayJobsSystem } = require('./day-jobs');
const { PeacePipeProtocol, getPeacePipeProtocol, SessionStatus } = require('./peace-pipe');

// Singleton instances for shared state
let _memoryInstance = null;
let _consensusInstance = null;
let _workerPoolInstance = null;

/**
 * Get shared memory layer instance
 */
function getMemory() {
    if (!_memoryInstance) {
        _memoryInstance = new UnifiedMemoryLayer();
    }
    return _memoryInstance;
}

/**
 * Get shared consensus engine instance
 */
function getConsensus(maxFaultyAgents = 1) {
    if (!_consensusInstance) {
        _consensusInstance = new DCBFTEngine(maxFaultyAgents);
    }
    return _consensusInstance;
}

/**
 * Get shared worker pool instance
 */
function getWorkerPool() {
    if (!_workerPoolInstance) {
        _workerPoolInstance = new WorkerPool();
    }
    return _workerPoolInstance;
}

/**
 * Get LLM client for a specific provider
 */
function getLLM(provider = null) {
    return new LLMClient(provider);
}

/**
 * Get overall OMEGA status
 */
function getOmegaStatus() {
    const memory = getMemory();
    const consensus = getConsensus();
    const workers = getWorkerPool();
    const llmStatus = LLMClient.getProvidersStatus();
    const ncSystem = getNeuroCreditSystem();
    const ppp = getPeacePipeProtocol();

    return {
        memory: memory.getStatus(),
        consensus: {
            min_required_agents: consensus.minRequiredAgents,
            pending_decisions: Object.keys(consensus.pendingDecisions).length,
            finalized_decisions: Object.keys(consensus.finalizedDecisions).length
        },
        workers: workers.getPoolStatus(),
        llm_providers: llmStatus,
        peace_pipe: ppp.getStatus(),
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    // Consensus
    DCBFTEngine,
    VoteType,
    ConsensusDecision,
    getConsensus,

    // Memory
    WorkingMemory,
    SessionMemory,
    SemanticMemory,
    RelationalMemory,
    UnifiedMemoryLayer,
    getMemory,

    // Workers
    WorkerAgent,
    WorkerPool,
    getWorkerPool,

    // LLM
    LLMClient,
    PROVIDERS,
    decomposeWithLLM,
    fallbackDecomposition,
    getLLM,

    // Neuro-Credit Economy
    NeuroCreditSystem,
    getNeuroCreditSystem,
    TransactionType,
    COSTS,
    EARNINGS,

    // Day Jobs
    DayJobsSystem,
    getDayJobsSystem,

    // Peace Pipe Protocol
    PeacePipeProtocol,
    getPeacePipeProtocol,
    SessionStatus,

    // Status
    getOmegaStatus
};
