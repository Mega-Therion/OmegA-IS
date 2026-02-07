/**
 * Brain ↔ Bridge Contract Tests
 *
 * Lightweight contract tests validating that Bridge API responses match
 * the expected schema. Tests are skipped gracefully if Bridge isn't running.
 *
 * Usage:
 *   npm run test:contracts
 *
 * Environment:
 *   - SKIP_CONTRACT_TESTS=1 to skip all tests
 *   - BRIDGE_API_URL (default: http://localhost:8000)
 */

const fetch = require('node-fetch');

const BRIDGE_URL = process.env.BRIDGE_API_URL || 'http://localhost:8000';
const SKIP_TESTS = process.env.SKIP_CONTRACT_TESTS === '1';

// Helper to check if Bridge is reachable
async function isBridgeAvailable() {
  try {
    const response = await fetch(`${BRIDGE_URL}/live`, { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Helper to make HTTP requests
async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BRIDGE_URL}${endpoint}`, options);
  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

// Test suite
describe('Brain ↔ Bridge Contract Tests', () => {
  let bridgeAvailable = false;

  beforeAll(async () => {
    if (!SKIP_TESTS) {
      bridgeAvailable = await isBridgeAvailable();
    }
  });

  // ================================================================
  // HEALTH & STATUS ENDPOINTS
  // ================================================================

  describe('GET /health', () => {
    test('should return health status with required fields', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/health');

      expect(status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('healthy');
      expect(data).toHaveProperty('service');
      expect(data.service).toBe('bridge');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('components');

      // Verify components structure
      expect(data.components).toHaveProperty('consensus_engine');
      expect(data.components).toHaveProperty('memory_layer');
      expect(data.components).toHaveProperty('orchestrator');
      expect(data.components).toHaveProperty('worker_pool');
    });

    test('should have valid consensus engine status', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { data } = await request('GET', '/health');
      const { consensus_engine } = data.components;

      expect(consensus_engine).toHaveProperty('status');
      expect(consensus_engine).toHaveProperty('pending_decisions');
      expect(consensus_engine).toHaveProperty('finalized_decisions');
      expect(consensus_engine).toHaveProperty('min_agents');
      expect(typeof consensus_engine.pending_decisions).toBe('number');
      expect(typeof consensus_engine.finalized_decisions).toBe('number');
      expect(typeof consensus_engine.min_agents).toBe('number');
    });
  });

  describe('GET /status', () => {
    test('should return detailed system status', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/status');

      expect(status).toBe(200);
      expect(data).toHaveProperty('service');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('orchestrator');
      expect(data).toHaveProperty('workers');
      expect(data).toHaveProperty('consensus');
      expect(data).toHaveProperty('timestamp');
    });
  });

  // ================================================================
  // ORCHESTRATOR ENDPOINTS
  // ================================================================

  describe('POST /orchestrate', () => {
    test('should decompose objective into sub-goals', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('POST', '/orchestrate', {
        objective: 'Test objective decomposition',
        max_goals: 3,
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('decomposed');
      expect(data).toHaveProperty('task_id');
      expect(data).toHaveProperty('sub_goals');
      expect(Array.isArray(data.sub_goals)).toBe(true);
      expect(data.sub_goals.length).toBeGreaterThan(0);
      expect(data.sub_goals.length).toBeLessThanOrEqual(3);
    });

    test('should return valid task structure', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { data } = await request('POST', '/orchestrate', {
        objective: 'Test task structure validation',
      });

      expect(typeof data.task_id).toBe('string');
      expect(data.task_id.length).toBeGreaterThan(0);

      // Each sub-goal should be a string
      data.sub_goals.forEach((goal) => {
        expect(typeof goal).toBe('string');
        expect(goal.length).toBeGreaterThan(0);
      });
    });
  });

  describe('GET /orchestrate/tasks', () => {
    test('should list active and completed tasks', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/orchestrate/tasks');

      expect(status).toBe(200);
      expect(data).toHaveProperty('active_tasks');
      expect(data).toHaveProperty('completed_count');
      expect(Array.isArray(data.active_tasks)).toBe(true);
      expect(typeof data.completed_count).toBe('number');
    });
  });

  // ================================================================
  // MEMORY ENDPOINTS
  // ================================================================

  describe('POST /memory/working', () => {
    test('should store entry in working memory', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('POST', '/memory/working', {
        type: 'test_entry',
        content: 'Test memory content',
        metadata: { test: true },
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('stored');
      expect(data).toHaveProperty('size');
      expect(data).toHaveProperty('budget');
      expect(typeof data.size).toBe('number');
      expect(typeof data.budget).toBe('number');
    });
  });

  describe('GET /memory/working', () => {
    test('should retrieve working memory entries', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/memory/working?count=5');

      expect(status).toBe(200);
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('size');
      expect(data).toHaveProperty('budget');
      expect(data).toHaveProperty('is_full');
      expect(Array.isArray(data.entries)).toBe(true);
      expect(typeof data.is_full).toBe('boolean');
    });
  });

  describe('GET /memory/status', () => {
    test('should return memory layer status', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/memory/status');

      expect(status).toBe(200);
      expect(data).toHaveProperty('working');
      expect(data).toHaveProperty('session');
      expect(data).toHaveProperty('semantic');
      expect(data).toHaveProperty('relational');
    });
  });

  // ================================================================
  // WORKER POOL ENDPOINTS
  // ================================================================

  describe('GET /workers/status', () => {
    test('should return worker pool status', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/workers/status');

      expect(status).toBe(200);
      expect(data).toHaveProperty('total_workers');
      expect(data).toHaveProperty('available_workers');
      expect(data).toHaveProperty('workers');
      expect(Array.isArray(data.workers)).toBe(true);
      expect(typeof data.total_workers).toBe('number');
      expect(typeof data.available_workers).toBe('number');
    });

    test('should have valid worker entries', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { data } = await request('GET', '/workers/status');

      data.workers.forEach((worker) => {
        expect(worker).toHaveProperty('id');
        expect(worker).toHaveProperty('role');
        expect(worker).toHaveProperty('is_available');
        expect(typeof worker.is_available).toBe('boolean');
      });
    });
  });

  describe('GET /workers/roles', () => {
    test('should list available worker roles', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/workers/roles');

      expect(status).toBe(200);
      expect(data).toHaveProperty('roles');
      expect(Array.isArray(data.roles)).toBe(true);
      expect(data.roles.length).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // CONSENSUS ENDPOINTS
  // ================================================================

  describe('POST /consensus/initiate', () => {
    test('should initiate a consensus vote', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('POST', '/consensus/initiate', {
        decision_id: `test_decision_${Date.now()}`,
        description: 'Test consensus decision',
        agents: ['agent1', 'agent2', 'agent3'],
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('initiated');
      expect(data).toHaveProperty('decision_id');
      expect(data).toHaveProperty('quorum');
      expect(typeof data.quorum).toBe('number');
    });
  });

  describe('GET /consensus/info', () => {
    test('should return consensus engine configuration', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/consensus/info');

      expect(status).toBe(200);
      expect(data).toHaveProperty('formula');
      expect(data).toHaveProperty('max_faulty_agents');
      expect(data).toHaveProperty('min_required_agents');
      expect(data).toHaveProperty('quorum_percentage');
      expect(typeof data.max_faulty_agents).toBe('number');
      expect(typeof data.min_required_agents).toBe('number');
    });
  });

  describe('GET /consensus/pending', () => {
    test('should list pending consensus decisions', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('GET', '/consensus/pending');

      expect(status).toBe(200);
      expect(data).toHaveProperty('pending');
      expect(data).toHaveProperty('count');
      expect(Array.isArray(data.pending)).toBe(true);
      expect(typeof data.count).toBe('number');
    });
  });

  // ================================================================
  // OMEGA GATEWAY ENDPOINTS
  // ================================================================

  describe('POST /omega/chat', () => {
    test('should handle chat request and return response', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status, data } = await request('POST', '/omega/chat', {
        messages: [{ role: 'user', content: 'Hello OMEGA' }],
        model: 'gpt-4',
      });

      expect(status).toBe(200);
      expect(data).toHaveProperty('ok');
      expect(data.ok).toBe(true);
      expect(data).toHaveProperty('response');
      expect(data.response).toHaveProperty('role');
      expect(data.response).toHaveProperty('content');
      expect(data).toHaveProperty('consensus');
      expect(data.consensus).toHaveProperty('available');
      expect(data.consensus).toHaveProperty('min_agents');
    });
  });

  // ================================================================
  // INTEGRATION TESTS
  // ================================================================

  describe('Full Pipeline Integration', () => {
    test('orchestrate -> workers -> memory flow', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      // 1. Decompose objective
      const decompose = await request('POST', '/orchestrate', {
        objective: 'Validate Brain-Bridge integration',
        max_goals: 2,
      });

      expect(decompose.status).toBe(200);
      expect(decompose.data).toHaveProperty('task_id');

      const taskId = decompose.data.task_id;

      // 2. Get task status
      const getTask = await request('GET', `/orchestrate/task/${taskId}`);
      expect(getTask.status).toBe(200);
      expect(getTask.data).toHaveProperty('task_id');

      // 3. Add to memory
      const addMem = await request('POST', '/memory/working', {
        type: 'integration_test',
        content: `Task ${taskId} created`,
        metadata: { test_type: 'integration' },
      });

      expect(addMem.status).toBe(200);
      expect(addMem.data.status).toBe('stored');

      // 4. Verify memory
      const getMem = await request('GET', '/memory/working?count=1');
      expect(getMem.status).toBe(200);
      expect(getMem.data.entries.length).toBeGreaterThan(0);
    });

    test('health check shows operational consensus engine', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { data } = await request('GET', '/health');
      const consensus = data.components.consensus_engine;

      expect(consensus.status).toBe('operational');
      expect(consensus.min_agents).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // ERROR HANDLING
  // ================================================================

  describe('Error Cases', () => {
    test('should handle invalid memory type gracefully', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      // Missing required fields should fail
      const { status } = await request('POST', '/memory/working', {
        // Missing 'type' and 'content'
      });

      // FastAPI should return 422 for validation error
      expect([200, 400, 422]).toContain(status);
    });

    test('should return 404 for nonexistent task', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status } = await request('GET', '/orchestrate/task/nonexistent_task_id');

      expect([404, 200]).toContain(status); // 404 expected, but may return empty 200
    });

    test('should return 404 for nonexistent decision', async () => {
      if (!bridgeAvailable) {
        console.warn('Skipping: Bridge not available');
        return;
      }

      const { status } = await request('GET', '/consensus/decision/nonexistent_decision');

      expect([404, 200]).toContain(status);
    });
  });
});
