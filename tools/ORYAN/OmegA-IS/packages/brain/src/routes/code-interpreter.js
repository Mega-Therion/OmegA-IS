/**
 * OMEGA Brain - Code Interpreter API Routes
 *
 * Endpoints for safe code execution and data analysis
 */

const express = require('express');
const router = express.Router();
const codeInterpreter = require('../services/code-interpreter');
const requireAuth = require('../middleware/auth');

// ===========================
// Python Execution
// ===========================

router.post('/python', requireAuth, async (req, res) => {
  try {
    const { code, timeout, sandbox } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code required' });
    }

    const result = await codeInterpreter.executePython(code, { timeout, sandbox });

    res.json(result);
  } catch (error) {
    console.error('[CodeInterpreter] Python execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// JavaScript Execution
// ===========================

router.post('/javascript', requireAuth, async (req, res) => {
  try {
    const { code, timeout } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code required' });
    }

    const result = await codeInterpreter.executeJavaScript(code, { timeout });

    res.json(result);
  } catch (error) {
    console.error('[CodeInterpreter] JavaScript execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Chart Generation
// ===========================

router.post('/chart', requireAuth, async (req, res) => {
  try {
    const { code, timeout } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'code required' });
    }

    const result = await codeInterpreter.generateChart(code, { timeout });

    res.json(result);
  } catch (error) {
    console.error('[CodeInterpreter] Chart generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Data Analysis
// ===========================

router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { data, analysisType } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data required' });
    }

    const result = await codeInterpreter.analyzeData(data, analysisType);

    res.json(result);
  } catch (error) {
    console.error('[CodeInterpreter] Data analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Quick Math
// ===========================

router.post('/math', requireAuth, async (req, res) => {
  try {
    const { expression } = req.body;

    if (!expression) {
      return res.status(400).json({ error: 'expression required' });
    }

    const code = `
import math
import numpy as np

result = ${expression}
print(f"Result: {result}")
`;

    const result = await codeInterpreter.executePython(code);

    res.json(result);
  } catch (error) {
    console.error('[CodeInterpreter] Math error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Package Management
// ===========================

router.post('/install', requireAuth, async (req, res) => {
  try {
    const { package: packageName } = req.body;

    if (!packageName) {
      return res.status(400).json({ error: 'package name required' });
    }

    // Check if package is in allowed list
    const allowedPackages = codeInterpreter.CONFIG.python.allowedModules;
    if (!allowedPackages.includes(packageName)) {
      return res.status(403).json({
        error: 'Package not in allowed list',
        allowedPackages,
      });
    }

    const result = await codeInterpreter.installPythonPackage(packageName);

    res.json(result);
  } catch (error) {
    console.error('[CodeInterpreter] Install error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Execution History
// ===========================

router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const history = codeInterpreter.getHistory(limit);

    res.json({ history });
  } catch (error) {
    console.error('[CodeInterpreter] History error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Health Check
// ===========================

router.get('/health', async (req, res) => {
  try {
    const pythonStatus = await codeInterpreter.checkPythonAvailable();
    const packages = await codeInterpreter.checkPythonPackages();

    res.json({
      status: 'healthy',
      python: pythonStatus,
      packages,
      config: {
        pythonTimeout: codeInterpreter.CONFIG.python.timeout,
        javascriptTimeout: codeInterpreter.CONFIG.javascript.timeout,
        maxOutputSize: codeInterpreter.CONFIG.python.maxOutputSize,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// ===========================
// Example Gallery
// ===========================

router.get('/examples', (req, res) => {
  const examples = {
    python: {
      hello_world: {
        name: 'Hello World',
        code: 'print("Hello from OMEGA Code Interpreter!")',
      },
      data_analysis: {
        name: 'Data Analysis',
        code: `import pandas as pd
import numpy as np

# Create sample data
data = {
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'score': [85, 92, 78]
}
df = pd.DataFrame(data)

print(df)
print("\\nAverage age:", df['age'].mean())
print("Average score:", df['score'].mean())`,
      },
      chart: {
        name: 'Simple Chart',
        code: `import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2, label='sin(x)')
plt.xlabel('x')
plt.ylabel('y')
plt.title('Sine Wave')
plt.legend()
plt.grid(True, alpha=0.3)`,
      },
      math: {
        name: 'Mathematical Computation',
        code: `import math

# Calculate factorial
n = 10
factorial = math.factorial(n)
print(f"{n}! = {factorial}")

# Calculate square root
sqrt_result = math.sqrt(144)
print(f"√144 = {sqrt_result}")

# Calculate pi
print(f"π ≈ {math.pi:.6f}")`,
      },
    },
    javascript: {
      hello_world: {
        name: 'Hello World',
        code: 'console.log("Hello from JavaScript!");',
      },
      fibonacci: {
        name: 'Fibonacci Sequence',
        code: `function fibonacci(n) {
  const fib = [0, 1];
  for (let i = 2; i < n; i++) {
    fib[i] = fib[i-1] + fib[i-2];
  }
  return fib;
}

const result = fibonacci(10);
console.log("Fibonacci sequence:", result);
return result;`,
      },
      data_processing: {
        name: 'Data Processing',
        code: `const data = [
  { name: 'Alice', score: 85 },
  { name: 'Bob', score: 92 },
  { name: 'Charlie', score: 78 }
];

const avg = data.reduce((sum, d) => sum + d.score, 0) / data.length;
console.log("Average score:", avg);

const sorted = data.sort((a, b) => b.score - a.score);
console.log("Top scorer:", sorted[0].name);

return { average: avg, topScorer: sorted[0].name };`,
      },
    },
  };

  res.json({ examples });
});

// ===========================
// Jupyter Notebook Support
// ===========================

router.post('/notebook', requireAuth, (req, res) => {
  try {
    const { code, cells } = req.body || {};
    const notebook = code
      ? codeInterpreter.createNotebookFromCode(code)
      : codeInterpreter.createNotebook(cells || []);
    res.json({ ok: true, notebook });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
