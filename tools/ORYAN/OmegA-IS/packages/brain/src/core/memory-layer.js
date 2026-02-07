/**
 * Memory Layer - OMEGA Core
 * 
 * Four-layer memory backbone: Working, Session, Semantic, and Relational.
 * Ported from Python bridge/memory_layer.py
 * 
 * Follows the Memory-First Design principle.
 */

/**
 * In-process context buffer with budgeting to prevent degradation
 */
class WorkingMemory {
    constructor(budget = 50) {
        this.budget = budget;
        this.memory = [];
        this.buffer = this.memory; // Back-compat alias
        this.metadata = {};
    }

    addEntry(entry) {
        entry.timestamp = new Date().toISOString();
        this.memory.push(entry);

        // Auto-prune when over budget
        while (this.memory.length > this.budget) {
            this.memory.shift();
        }
    }

    getRecent(count = 10) {
        return this.memory.slice(-count);
    }

    clear() {
        this.memory = [];
        this.buffer = this.memory;
    }

    getSize() {
        return this.memory.length;
    }

    isFull() {
        return this.memory.length >= this.budget;
    }
}

/**
 * Session memory for sub-millisecond coordination of live task states
 * Placeholder for Redis integration
 */
class SessionMemory {
    constructor() {
        this.sessions = {};
    }

    setSession(sessionId, data) {
        this.sessions[sessionId] = {
            data,
            updated_at: new Date().toISOString()
        };
    }

    getSession(sessionId) {
        const session = this.sessions[sessionId];
        return session ? session.data : null;
    }

    deleteSession(sessionId) {
        if (this.sessions[sessionId]) {
            delete this.sessions[sessionId];
            return true;
        }
        return false;
    }

    sessionExists(sessionId) {
        return sessionId in this.sessions;
    }
}

/**
 * Vector memory for sub-30ms semantic retrieval
 * Placeholder for Milvus/Vector DB integration
 */
class SemanticMemory {
    constructor() {
        this.vectors = {};
        this.indexCount = 0;
    }

    indexDocument(docId, content, metadata = {}) {
        const vectorId = `vec_${this.indexCount}`;
        this.indexCount++;

        this.vectors[vectorId] = {
            doc_id: docId,
            content,
            metadata,
            indexed_at: new Date().toISOString(),
            embedding: null // Would be actual vector in production
        };

        return vectorId;
    }

    semanticSearch(query, topK = 5) {
        // Placeholder: return all vectors (production would use HNSW similarity)
        return Object.values(this.vectors).slice(0, topK);
    }

    getDocument(vectorId) {
        return this.vectors[vectorId] || null;
    }
}

/**
 * Graph memory for multi-hop reasoning
 * Placeholder for Neo4j integration
 */
class RelationalMemory {
    constructor() {
        this.nodes = {};
        this.relationships = [];
    }

    createNode(nodeId, nodeType, properties) {
        this.nodes[nodeId] = {
            type: nodeType,
            properties,
            created_at: new Date().toISOString()
        };
    }

    createRelationship(fromNode, toNode, relType, properties = {}) {
        this.relationships.push({
            from: fromNode,
            to: toNode,
            type: relType,
            properties,
            created_at: new Date().toISOString()
        });
    }

    findPath(startNode, endNode, maxHops = 3) {
        // Placeholder: basic path finding
        // Production would use Neo4j Cypher queries
        return null;
    }

    getNode(nodeId) {
        return this.nodes[nodeId] || null;
    }
}

/**
 * Unified interface for all memory layers
 */
class UnifiedMemoryLayer {
    constructor(workingBudget = 50) {
        this.working = new WorkingMemory(workingBudget);
        this.session = new SessionMemory();
        this.semantic = new SemanticMemory();
        this.relational = new RelationalMemory();
    }

    getStatus() {
        const status = {
            working_memory: {
                size: this.working.getSize(),
                budget: this.working.budget,
                is_full: this.working.isFull()
            },
            session_memory: {
                active_sessions: Object.keys(this.session.sessions).length
            },
            semantic_memory: {
                indexed_documents: Object.keys(this.semantic.vectors).length
            },
            relational_memory: {
                nodes: Object.keys(this.relational.nodes).length,
                relationships: this.relational.relationships.length
            }
        };

        // Legacy key for compatibility
        status.working = status.working_memory;
        return status;
    }
}

module.exports = {
    WorkingMemory,
    SessionMemory,
    SemanticMemory,
    RelationalMemory,
    UnifiedMemoryLayer
};
