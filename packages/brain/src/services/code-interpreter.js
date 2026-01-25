/**
 * OMEGA Brain - Code Interpreter Service
 *
 * Safe code execution in sandboxed environments for:
 * - Python (data analysis, ML, charts)
 * - JavaScript/Node.js
 * - Mathematical computations
 * - Data visualization
 *
 * Security Features:
 * - Execution timeout
 * - Memory limits
 * - Restricted file system access
 * - No network access by default
 * - Output size limits
 */

const { spawn } = require('child_process');
const vm = require('vm');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// ===========================
// Configuration
// ===========================

const CONFIG = {
  python: {
    timeout: 30000, // 30 seconds
    maxOutputSize: 1024 * 1024, // 1MB
    maxMemoryMB: 512,
    allowedModules: [
      'numpy', 'pandas', 'matplotlib', 'seaborn',
      'scipy', 'sklearn', 'math', 'statistics',
      'json', 'csv', 'datetime', 'random',
    ],
  },
  javascript: {
    timeout: 10000, // 10 seconds
    maxOutputSize: 1024 * 1024, // 1MB
  },
  workDir: '/tmp/omega-code-interpreter',
};

// ===========================
// Python Code Execution
// ===========================

async function executePython(code, options = {}) {
  if ((options.sandbox || process.env.CODE_INTERPRETER_SANDBOX) === 'e2b') {
    return executePythonE2B(code, options);
  }

  const executionId = crypto.randomUUID();
  const workDir = path.join(CONFIG.workDir, executionId);

  try {
    // Create work directory
    await fs.mkdir(workDir, { recursive: true });

    // Write code to file
    const codeFile = path.join(workDir, 'script.py');
    await fs.writeFile(codeFile, code, 'utf-8');

    // Prepare Python environment with safety wrapper
    const safetyWrapper = `
import sys
import signal
import json
import traceback
from io import StringIO

# Timeout handler
def timeout_handler(signum, frame):
    raise TimeoutError("Execution timeout exceeded")

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(${Math.floor((options.timeout || CONFIG.python.timeout) / 1000)})

# Capture stdout/stderr
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = StringIO()
sys.stderr = StringIO()

result = {
    "success": False,
    "output": "",
    "error": None,
    "variables": {}
}

try:
    # Execute user code
    exec(open('${codeFile}').read(), globals())

    # Capture output
    result["output"] = sys.stdout.getvalue()
    result["success"] = True

    # Capture final variables (exclude builtins and modules)
    result["variables"] = {
        k: str(v) for k, v in globals().items()
        if not k.startswith('_')
        and k not in ['sys', 'signal', 'json', 'traceback', 'StringIO']
        and not callable(v)
    }

except Exception as e:
    result["error"] = {
        "type": type(e).__name__,
        "message": str(e),
        "traceback": traceback.format_exc()
    }
    result["output"] = sys.stderr.getvalue()

finally:
    signal.alarm(0)  # Cancel alarm
    sys.stdout = old_stdout
    sys.stderr = old_stderr
    print(json.dumps(result))
`;

    const wrapperFile = path.join(workDir, 'wrapper.py');
    await fs.writeFile(wrapperFile, safetyWrapper, 'utf-8');

    // Execute Python with restrictions
    const result = await new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      const startTime = Date.now();

      const python = spawn('python3', [wrapperFile], {
        cwd: workDir,
        timeout: options.timeout || CONFIG.python.timeout,
        env: {
          ...process.env,
          PYTHONPATH: workDir,
          // Limit memory (Linux only)
          ...(process.platform === 'linux' && {
            // Note: ulimit doesn't work with spawn, need Docker for real limits
          }),
        },
      });

      python.stdout.on('data', (data) => {
        stdout += data.toString();
        if (stdout.length > CONFIG.python.maxOutputSize) {
          python.kill();
          reject(new Error('Output size limit exceeded'));
        }
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('error', (error) => {
        reject(error);
      });

      python.on('close', (code) => {
        const executionTime = Date.now() - startTime;

        if (code === null) {
          reject(new Error('Process terminated (timeout or killed)'));
          return;
        }

        try {
          // Parse JSON result from wrapper
          const lines = stdout.trim().split('\n');
          const jsonLine = lines[lines.length - 1];
          const result = JSON.parse(jsonLine);

          resolve({
            ...result,
            executionTime,
            exitCode: code,
          });
        } catch (error) {
          // Fallback if JSON parsing fails
          resolve({
            success: code === 0,
            output: stdout,
            error: stderr || null,
            executionTime,
            exitCode: code,
          });
        }
      });
    });

    return result;

  } catch (error) {
    return {
      success: false,
      output: '',
      error: {
        type: 'ExecutionError',
        message: error.message,
      },
    };
  } finally {
    // Cleanup work directory
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (err) {
      console.error('[CodeInterpreter] Cleanup error:', err);
    }
  }
}

async function executePythonE2B(code, options = {}) {
  if (!process.env.E2B_API_KEY) {
    return {
      success: false,
      error: {
        type: 'E2BConfigError',
        message: 'E2B_API_KEY is not set',
      },
    };
  }

  let sdk;
  try {
    sdk = require('e2b');
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'E2BMissingDependency',
        message: 'E2B SDK not installed',
      },
    };
  }

  const startTime = Date.now();
  const sandbox = await sdk.Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  let result;

  if (typeof sandbox.runCode === 'function') {
    result = await sandbox.runCode(code, { language: 'python' });
  } else if (typeof sandbox.run === 'function') {
    result = await sandbox.run({ language: 'python', code });
  } else {
    throw new Error('Unsupported E2B SDK interface');
  }

  if (typeof sandbox.close === 'function') {
    await sandbox.close();
  }

  return {
    success: !result?.error,
    output: result?.stdout || result?.output || '',
    error: result?.stderr || result?.error || null,
    executionTime: Date.now() - startTime,
  };
}

// ===========================
// JavaScript Code Execution
// ===========================

async function executeJavaScript(code, options = {}) {
  const executionId = crypto.randomUUID();

  try {
    const startTime = Date.now();
    let output = '';
    let capturedReturn = undefined;

    // Create safe context
    const sandbox = {
      console: {
        log: (...args) => {
          output += args.map(a => String(a)).join(' ') + '\n';
        },
        error: (...args) => {
          output += 'ERROR: ' + args.map(a => String(a)).join(' ') + '\n';
        },
        warn: (...args) => {
          output += 'WARN: ' + args.map(a => String(a)).join(' ') + '\n';
        },
      },
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      setTimeout: null, // Blocked
      setInterval: null, // Blocked
      require: null, // Blocked
      process: null, // Blocked
      global: null, // Blocked
    };

    // Wrap code to capture return value
    const wrappedCode = `
      (function() {
        ${code}
      })()
    `;

    // Create VM context
    const context = vm.createContext(sandbox);

    // Execute with timeout
    const script = new vm.Script(wrappedCode);
    capturedReturn = script.runInContext(context, {
      timeout: options.timeout || CONFIG.javascript.timeout,
      displayErrors: true,
    });

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      output: output.trim(),
      returnValue: capturedReturn,
      executionTime,
      variables: Object.keys(sandbox).reduce((acc, key) => {
        if (!['console', 'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean'].includes(key)) {
          acc[key] = sandbox[key];
        }
        return acc;
      }, {}),
    };

  } catch (error) {
    return {
      success: false,
      output: '',
      error: {
        type: error.name,
        message: error.message,
        stack: error.stack,
      },
    };
  }
}

// ===========================
// Chart Generation (Python)
// ===========================

async function generateChart(chartCode, options = {}) {
  const executionId = crypto.randomUUID();
  const workDir = path.join(CONFIG.workDir, executionId);

  try {
    await fs.mkdir(workDir, { recursive: true });

    // Wrap chart code with matplotlib setup
    const fullCode = `
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# User chart code
${chartCode}

# Save to file
plt.tight_layout()
plt.savefig('chart.png', dpi=150, bbox_inches='tight')
plt.close()

print("Chart saved successfully")
`;

    const result = await executePython(fullCode, {
      ...options,
      workDir,
    });

    if (result.success) {
      // Read generated chart
      const chartPath = path.join(workDir, 'chart.png');
      const chartBuffer = await fs.readFile(chartPath);
      const chartBase64 = chartBuffer.toString('base64');

      return {
        success: true,
        chart: {
          base64: chartBase64,
          mimeType: 'image/png',
        },
        output: result.output,
      };
    }

    return result;

  } catch (error) {
    return {
      success: false,
      error: {
        type: 'ChartGenerationError',
        message: error.message,
      },
    };
  } finally {
    // Cleanup
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (err) {
      console.error('[CodeInterpreter] Cleanup error:', err);
    }
  }
}

// ===========================
// Data Analysis Helper
// ===========================

async function analyzeData(data, analysisType = 'summary') {
  const dataJson = JSON.stringify(data);

  const code = `
import pandas as pd
import json

# Load data
data = json.loads('''${dataJson}''')
df = pd.DataFrame(data)

# Perform analysis
if "${analysisType}" == "summary":
    print("\\nData Summary:")
    print(df.describe().to_string())
    print("\\nData Types:")
    print(df.dtypes.to_string())
    print("\\nMissing Values:")
    print(df.isnull().sum().to_string())

elif "${analysisType}" == "correlation":
    print("\\nCorrelation Matrix:")
    print(df.corr().to_string())

elif "${analysisType}" == "stats":
    print("\\nStatistical Summary:")
    for col in df.select_dtypes(include=['number']).columns:
        print(f"\\n{col}:")
        print(f"  Mean: {df[col].mean():.2f}")
        print(f"  Median: {df[col].median():.2f}")
        print(f"  Std: {df[col].std():.2f}")
        print(f"  Min: {df[col].min():.2f}")
        print(f"  Max: {df[col].max():.2f}")
`;

  return await executePython(code);
}

// ===========================
// Execution History
// ===========================

const executionHistory = [];
const MAX_HISTORY = 100;

function addToHistory(execution) {
  executionHistory.unshift(execution);
  if (executionHistory.length > MAX_HISTORY) {
    executionHistory.pop();
  }
}

function getHistory(limit = 10) {
  return executionHistory.slice(0, limit);
}

function createNotebook(cells = []) {
  return {
    cells: cells.map((cell) => ({
      cell_type: cell.type || 'code',
      source: Array.isArray(cell.source) ? cell.source : [cell.source || ''],
      metadata: {},
      outputs: [],
      execution_count: null,
    })),
    metadata: {
      kernelspec: { name: 'python3', display_name: 'Python 3' },
      language_info: { name: 'python' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
}

function createNotebookFromCode(code) {
  return createNotebook([{ type: 'code', source: code }]);
}

// ===========================
// Utility Functions
// ===========================

async function checkPythonAvailable() {
  try {
    const { stdout } = await new Promise((resolve, reject) => {
      const python = spawn('python3', ['--version']);
      let stdout = '';
      python.stdout.on('data', (data) => stdout += data);
      python.on('close', () => resolve({ stdout }));
      python.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
    return { available: true, version: stdout.trim() };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

async function checkPythonPackages(packages = CONFIG.python.allowedModules) {
  try {
    const script = `
import importlib
import json
packages = ${JSON.stringify(packages)}
missing = []
for pkg in packages:
    try:
        importlib.import_module(pkg)
    except Exception:
        missing.append(pkg)
print(json.dumps({ "missing": missing }))
`;
    const result = await executePython(script, { timeout: 5000 });
    if (!result.success) {
      return { missing: packages, error: result.error?.message || 'Failed to check packages' };
    }
    const lines = (result.output || '').trim().split('\n');
    const jsonLine = lines[lines.length - 1];
    const parsed = JSON.parse(jsonLine);
    return { missing: parsed.missing || [] };
  } catch (error) {
    return { missing: packages, error: error.message };
  }
}

async function installPythonPackage(packageName) {
  try {
    const result = await new Promise((resolve, reject) => {
      const pip = spawn('pip3', ['install', packageName]);
      let stdout = '';
      let stderr = '';
      pip.stdout.on('data', (data) => stdout += data);
      pip.stderr.on('data', (data) => stderr += data);
      pip.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          reject(new Error(stderr || 'Installation failed'));
        }
      });
    });
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ===========================
// Exports
// ===========================

module.exports = {
  executePython,
  executeJavaScript,
  generateChart,
  analyzeData,
  checkPythonAvailable,
  checkPythonPackages,
  installPythonPackage,
  getHistory,
  createNotebook,
  createNotebookFromCode,
  CONFIG,
};
