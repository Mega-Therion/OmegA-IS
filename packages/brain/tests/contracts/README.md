# Brain ↔ Bridge Contract Tests

Lightweight contract tests validating that the Bridge API (Python/FastAPI on :8000) responses match the expected schema and structure.

## Overview

These tests are **not full integration tests**. They focus on:

- Response schema validation (correct fields, proper types)
- HTTP status codes
- API contract compliance
- Graceful handling of Bridge unavailability

These tests **do not test**:
- Full business logic
- State persistence
- Side effects
- Performance characteristics

## Running Tests

### Basic Usage

```bash
# Run all contract tests
npm run test:contracts

# Run with watch mode
npm run test:contracts -- --watch

# Run with coverage
npm run test:contracts -- --coverage

# Run specific test suite
npm run test:contracts -- brain-bridge.contract.test.js
```

### Environment Variables

```bash
# Set Bridge API URL (default: http://localhost:8000)
BRIDGE_API_URL=http://bridge-api.example.com:8000 npm run test:contracts

# Skip all tests (useful in CI when Bridge isn't available)
SKIP_CONTRACT_TESTS=1 npm run test:contracts

# Set request timeout in milliseconds (default: 5000)
BRIDGE_TIMEOUT=10000 npm run test:contracts
```

## Test Structure

### Test Suites

1. **Health & Status Endpoints**
   - `GET /health` - Health check with component status
   - `GET /status` - Detailed system status
   - `GET /ready` - Readiness probe

2. **Orchestrator Endpoints**
   - `POST /orchestrate` - Decompose objective into sub-goals
   - `GET /orchestrate/tasks` - List active and completed tasks
   - `GET /orchestrate/task/:id` - Get specific task status

3. **Memory Endpoints**
   - `POST /memory/working` - Store entry in working memory
   - `GET /memory/working` - Retrieve recent entries
   - `GET /memory/status` - Memory layer status

4. **Worker Pool Endpoints**
   - `GET /workers/status` - Worker pool status
   - `GET /workers/roles` - Available worker roles

5. **Consensus Endpoints**
   - `POST /consensus/initiate` - Initiate a consensus vote
   - `GET /consensus/info` - Consensus engine configuration
   - `GET /consensus/pending` - Pending decisions

6. **OMEGA Gateway Endpoints**
   - `POST /omega/chat` - Chat request and response

### Integration Tests

- **Full Pipeline**: Test orchestrate → workers → memory flow
- **Health Consistency**: Verify consensus engine is operational

### Error Cases

- Invalid request handling
- 404 responses for nonexistent resources
- 422 validation errors

## Graceful Failure

If the Bridge is not running or not responding:

1. Tests automatically detect unavailability via `isBridgeAvailable()`
2. Individual tests are skipped with a warning message
3. Test suite completes with `passWithNoTests` (no failure)

**Example output when Bridge is down:**

```
PASS  tests/contracts/brain-bridge.contract.test.js
  Brain ↔ Bridge Contract Tests
    GET /health
      ✓ should return health status with required fields (3ms)
        Skipping: Bridge not available
```

## Helpers

Common test utilities are in `helpers.js`:

```javascript
const {
  isBridgeAvailable,    // Check if Bridge is responding
  request,              // Make HTTP requests to Bridge
  validateSchema,       // Validate response schema
  sleep,               // Async sleep utility
  generateTestId,      // Generate unique test IDs
  createTestFixture,   // Create common test data
} = require('./helpers');
```

### Example: Using Helpers

```javascript
const { request, validateSchema } = require('./helpers');

test('should validate health response', async () => {
  const { status, data } = await request('GET', '/health');

  expect(status).toBe(200);

  const schema = {
    status: 'string',
    service: 'string',
    components: 'object',
  };

  const validation = validateSchema(data, schema);
  expect(validation.valid).toBe(true);
});
```

## Adding New Tests

When adding new contract tests:

1. **Follow naming convention**: `describe('API Feature', () => { ... })`
2. **Check Bridge availability**: Wrap tests with `if (!bridgeAvailable) return;`
3. **Validate schema**: Use `validateSchema()` helper for consistency
4. **Test error cases**: Include tests for invalid requests
5. **Keep tests lightweight**: Focus on schema, not business logic

### Template

```javascript
describe('New Feature', () => {
  test('should do something', async () => {
    if (!bridgeAvailable) {
      console.warn('Skipping: Bridge not available');
      return;
    }

    const { status, data } = await request('POST', '/endpoint', {
      field: 'value',
    });

    expect(status).toBe(200);
    expect(data).toHaveProperty('response_field');
  });
});
```

## Continuous Integration

For CI environments where Bridge isn't running:

```yaml
# Example: GitHub Actions
- name: Run contract tests (skip if unavailable)
  run: npm run test:contracts
  env:
    SKIP_CONTRACT_TESTS: '1'
```

Tests will pass without running if Bridge is unavailable.

## Debugging

### Enable verbose output

```bash
npm run test:contracts -- --verbose
```

### Run single test

```bash
npm run test:contracts -- --testNamePattern="should return health status"
```

### Check Bridge connectivity

```bash
curl http://localhost:8000/health
```

### View test coverage

```bash
npm run test:contracts -- --coverage --coveragePathIgnorePatterns=/node_modules/
```

## Dependencies

- **jest**: Test framework
- **node-fetch**: HTTP client (already in Brain dependencies)

No additional dependencies needed.

## Notes

- Tests use `node-fetch` which is already in the Brain's dependencies
- Each test has a 10-second timeout (configurable via `testTimeout` in jest.config.js)
- HTTP requests have a 5-second timeout (configurable via `BRIDGE_TIMEOUT`)
- Tests are isolated; no cleanup needed between tests
