/**
 * Contract Test Helpers
 *
 * Utility functions for Brain ↔ Bridge contract tests.
 */

const fetch = require('node-fetch');

/**
 * Configuration for Bridge API
 */
const config = {
  bridgeUrl: process.env.BRIDGE_API_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.BRIDGE_TIMEOUT || '5000', 10),
  skipTests: process.env.SKIP_CONTRACT_TESTS === '1',
};

/**
 * Check if Bridge is available and responding
 * @returns {Promise<boolean>}
 */
async function isBridgeAvailable() {
  if (config.skipTests) {
    return false;
  }

  try {
    const response = await fetch(`${config.bridgeUrl}/live`, {
      timeout: 3000,
      method: 'GET',
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Make HTTP request to Bridge API
 *
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {string} endpoint - API endpoint (e.g., /health, /orchestrate)
 * @param {object} [body] - Request body for POST/PUT/PATCH
 * @returns {Promise<{status: number, data: object, headers: object}>}
 */
async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: config.timeout,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${config.bridgeUrl}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      data,
      headers: response.headers,
    };
  } catch (error) {
    throw new Error(
      `Bridge API request failed: ${method} ${endpoint} - ${error.message}`
    );
  }
}

/**
 * Validate response schema against expected structure
 *
 * @param {object} response - Response object to validate
 * @param {object} expectedSchema - Expected schema (keys to check)
 * @param {object} [options] - Validation options
 * @returns {object} - Validation result { valid: boolean, errors: string[] }
 */
function validateSchema(response, expectedSchema, options = {}) {
  const errors = [];
  const { strict = false } = options;

  // Check expected fields
  for (const [key, expectedType] of Object.entries(expectedSchema)) {
    if (!(key in response)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }

    const actualType = typeof response[key];
    if (expectedType !== 'any' && actualType !== expectedType) {
      errors.push(
        `Field ${key} has wrong type: expected ${expectedType}, got ${actualType}`
      );
    }
  }

  // Check for unexpected fields if strict mode
  if (strict) {
    const expectedKeys = Object.keys(expectedSchema);
    for (const key of Object.keys(response)) {
      if (!expectedKeys.includes(key)) {
        errors.push(`Unexpected field: ${key}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique ID for test isolation
 * @returns {string}
 */
function generateTestId() {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a test fixture with common data
 * @returns {object}
 */
function createTestFixture() {
  return {
    testId: generateTestId(),
    timestamp: new Date().toISOString(),
    objective: 'Test objective for contract validation',
    memoryEntry: {
      type: 'test_entry',
      content: 'Test memory content',
      metadata: { test: true, testId: generateTestId() },
    },
    consensusDecision: {
      decision_id: `decision_${generateTestId()}`,
      description: 'Test consensus decision',
      agents: ['agent1', 'agent2', 'agent3', 'agent4'],
    },
  };
}

module.exports = {
  config,
  isBridgeAvailable,
  request,
  validateSchema,
  sleep,
  generateTestId,
  createTestFixture,
};
