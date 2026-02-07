# Contract Tests - Quick Start

## 30-Second Setup

```bash
# 1. Install Jest (if needed)
npm install --save-dev jest

# 2. Ensure Bridge is running
cd packages/bridge
python main.py  # or: uvicorn api:app --reload

# 3. Run tests (from brain directory)
cd ../brain
npm run test:contracts
```

## Expected Output

### When Bridge is Running
```
PASS  tests/contracts/brain-bridge.contract.test.js (5.234s)
  Brain ↔ Bridge Contract Tests
    GET /health
      ✓ should return health status with required fields (45ms)
      ✓ should have valid consensus engine status (32ms)
    POST /orchestrate
      ✓ should decompose objective into sub-goals (52ms)
      ✓ should return valid task structure (48ms)
    ...
    Full Pipeline Integration
      ✓ orchestrate -> workers -> memory flow (156ms)

Test Suites: 1 passed, 1 total
Tests:       40 passed, 40 total
Snapshots:   0 total
Time:        5.234s
```

### When Bridge is NOT Running
```
PASS  tests/contracts/brain-bridge.contract.test.js
  Brain ↔ Bridge Contract Tests
    GET /health
      ✓ should return health status with required fields (3ms)
        Skipping: Bridge not available
    ...

Test Suites: 1 passed, 1 total
Tests:       40 skipped, 40 total
Snapshots:   0 total
Time:        0.234s
```

## Common Commands

```bash
# Run all tests
npm run test:contracts

# Run with watch (re-run on file changes)
npm run test:contracts -- --watch

# Run specific test
npm run test:contracts -- --testNamePattern="health"

# Generate coverage report
npm run test:contracts -- --coverage

# Run in CI mode (no watch, detailed output)
npm run test:contracts -- --ci
```

## Environment Variables

```bash
# Use custom Bridge URL
BRIDGE_API_URL=http://bridge.example.com:8000 npm run test:contracts

# Skip tests in CI when Bridge unavailable
SKIP_CONTRACT_TESTS=1 npm run test:contracts

# Increase request timeout
BRIDGE_TIMEOUT=15000 npm run test:contracts
```

## What Gets Tested

- **Health/Status**: System health and component status
- **Orchestrator**: Task decomposition and management
- **Memory**: Working memory operations
- **Workers**: Worker pool status
- **Consensus**: DCBFT consensus engine
- **OMEGA Gateway**: Chat integration
- **Integration**: Full pipeline flows
- **Error Handling**: Invalid requests and edge cases

## Typical Workflow

### Development
```bash
# 1. Start Bridge in one terminal
cd packages/bridge && python main.py

# 2. Run tests in another terminal
cd packages/brain
npm run test:contracts -- --watch
```

### Adding New Tests
1. Open `tests/contracts/brain-bridge.contract.test.js`
2. Find the appropriate `describe()` block
3. Add a new `test()` using the pattern in the file
4. Save; tests re-run automatically with `--watch`

### CI/CD
```bash
# Skip tests if Bridge unavailable
SKIP_CONTRACT_TESTS=1 npm run test:contracts
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Bridge not available" | Start Bridge: `cd packages/bridge && python main.py` |
| "jest: command not found" | Install Jest: `npm install --save-dev jest` |
| Timeout errors | Increase timeout: `BRIDGE_TIMEOUT=10000 npm run test:contracts` |
| Tests not found | Ensure you're in `packages/brain` directory |

## Files Overview

```
packages/brain/tests/contracts/
├── brain-bridge.contract.test.js  # Main test suite
├── helpers.js                     # Reusable utilities
├── README.md                      # Full documentation
└── QUICKSTART.md                  # This file
```

## Key Helper Functions

```javascript
// Import helpers
const {
  isBridgeAvailable,  // Check if Bridge is responding
  request,           // Make HTTP requests
  validateSchema,    // Validate response structure
  generateTestId,    // Create unique IDs
  createTestFixture, // Common test data
} = require('./helpers');

// Use them
const { status, data } = await request('GET', '/health');
expect(status).toBe(200);
```

## Next Steps

1. Read the full [README.md](./README.md) for detailed documentation
2. Explore the test file to see all endpoints being tested
3. Add tests for new Bridge endpoints as they're created
4. Integrate into your CI/CD pipeline

## Quick Links

- **Full Docs**: [README.md](./README.md)
- **Overview**: [BRAIN_BRIDGE_CONTRACTS.md](../../BRAIN_BRIDGE_CONTRACTS.md)
- **Bridge API**: [packages/bridge/api.py](../../bridge/api.py)
- **Brain Package**: [packages/brain/](../)

---

**Happy testing!** 🧪
