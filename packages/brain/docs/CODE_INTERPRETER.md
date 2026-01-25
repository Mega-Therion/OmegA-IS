# OMEGA Brain - Code Interpreter Guide

**Feature:** Sandboxed code execution for data analysis and computation
**Status:** ✅ Ready for use
**Added:** January 25, 2026

---

## 🎯 Overview

OMEGA Brain includes a secure code interpreter that enables agents to execute Python and JavaScript code in sandboxed environments. This unlocks powerful capabilities for:

- 📊 **Data Analysis** - Process and analyze datasets with pandas/numpy
- 📈 **Visualization** - Generate charts and graphs with matplotlib
- 🧮 **Math & Science** - Perform complex calculations
- 💻 **Scripting** - Execute custom logic and transformations
- 🔬 **Machine Learning** - Run ML models with scikit-learn

---

## 🔒 Security Features

**Multi-Layer Sandboxing:**
- ✅ **Process Isolation** - Python runs in separate subprocess
- ✅ **VM Isolation** - JavaScript runs in isolated VM context
- ✅ **Timeout Controls** - Automatic termination after timeout
- ✅ **Output Limits** - Maximum 1MB output size
- ✅ **Memory Limits** - Restricted memory allocation (512MB for Python)
- ✅ **Filesystem Isolation** - Temporary work directories, auto-cleanup
- ✅ **No Network Access** - Network operations disabled by default
- ✅ **Restricted Modules** - Only whitelisted Python packages allowed

---

## 📦 Installation

### Prerequisites

The code interpreter requires Python 3 to be installed on your system:

```bash
# Check if Python 3 is installed
python3 --version

# If not installed:
# Ubuntu/Debian
sudo apt install python3 python3-pip

# macOS
brew install python3

# Windows
# Download from python.org
```

### Install Python Packages

Install the scientific computing packages:

```bash
pip3 install numpy pandas matplotlib seaborn scipy scikit-learn
```

### Verify Installation

```bash
# Start OMEGA Brain
npm start

# Check code interpreter health
curl http://localhost:8080/code-interpreter/health
```

Expected response:
```json
{
  "status": "healthy",
  "python": {
    "available": true,
    "version": "Python 3.x.x"
  },
  "config": {
    "pythonTimeout": 30000,
    "javascriptTimeout": 10000,
    "maxOutputSize": 1048576
  }
}
```

---

## 🚀 Quick Start

### Example 1: Simple Python Calculation

```javascript
const axios = require('axios');

const { data } = await axios.post('http://localhost:8080/code-interpreter/python', {
  code: `
import math

# Calculate factorial
result = math.factorial(10)
print(f"10! = {result}")
  `,
}, {
  headers: { 'Authorization': `Bearer ${token}` },
});

console.log(data);
// Output:
// {
//   success: true,
//   output: "10! = 3628800\n",
//   executionTime: 123,
//   exitCode: 0
// }
```

### Example 2: Data Analysis with Pandas

```javascript
const { data } = await axios.post('http://localhost:8080/code-interpreter/python', {
  code: `
import pandas as pd
import numpy as np

# Create sample data
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie', 'Diana'],
    'age': [25, 30, 35, 28],
    'score': [85, 92, 78, 95]
})

print("Data:")
print(df)
print("\\nStatistics:")
print(df.describe())
print(f"\\nAverage score: {df['score'].mean():.2f}")
  `,
});

console.log(data.output);
```

### Example 3: JavaScript Execution

```javascript
const { data } = await axios.post('http://localhost:8080/code-interpreter/javascript', {
  code: `
function fibonacci(n) {
  const fib = [0, 1];
  for (let i = 2; i < n; i++) {
    fib[i] = fib[i-1] + fib[i-2];
  }
  return fib;
}

const result = fibonacci(10);
console.log("Fibonacci sequence:", result);
return result;
  `,
});

console.log(data.returnValue); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### Example 4: Chart Generation

```javascript
const { data } = await axios.post('http://localhost:8080/code-interpreter/chart', {
  code: `
import numpy as np

# Generate data
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# Create plot
plt.figure(figsize=(10, 6))
plt.plot(x, y1, 'b-', linewidth=2, label='sin(x)')
plt.plot(x, y2, 'r--', linewidth=2, label='cos(x)')
plt.xlabel('x')
plt.ylabel('y')
plt.title('Trigonometric Functions')
plt.legend()
plt.grid(True, alpha=0.3)
  `,
});

// data.chart.base64 contains the PNG image as base64
const imageData = `data:image/png;base64,${data.chart.base64}`;
```

---

## 🔧 API Reference

### Python Execution

#### Execute Python Code
```
POST /code-interpreter/python
```

**Body:**
```json
{
  "code": "print('Hello, World!')",
  "timeout": 30000
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": null,
  "variables": {},
  "executionTime": 125,
  "exitCode": 0
}
```

**Error Response:**
```json
{
  "success": false,
  "output": "",
  "error": {
    "type": "ZeroDivisionError",
    "message": "division by zero",
    "traceback": "Traceback (most recent call last):\n..."
  },
  "executionTime": 50,
  "exitCode": 1
}
```

---

### JavaScript Execution

#### Execute JavaScript Code
```
POST /code-interpreter/javascript
```

**Body:**
```json
{
  "code": "const x = 5; const y = 10; return x + y;",
  "timeout": 10000
}
```

**Response:**
```json
{
  "success": true,
  "output": "",
  "returnValue": 15,
  "executionTime": 12,
  "variables": {}
}
```

**Available Globals:**
- `Math` - Mathematical functions
- `Date` - Date/time operations
- `JSON` - JSON parsing/stringifying
- `Array`, `Object`, `String`, `Number`, `Boolean`
- `console.log()`, `console.error()`, `console.warn()`

**Blocked for Security:**
- `setTimeout`, `setInterval` - Timing functions
- `require` - Module loading
- `process` - Process access
- `global` - Global scope

---

### Chart Generation

#### Generate Chart/Visualization
```
POST /code-interpreter/chart
```

**Body:**
```json
{
  "code": "plt.plot([1, 2, 3], [1, 4, 9])\nplt.title('Simple Chart')",
  "timeout": 30000
}
```

**Response:**
```json
{
  "success": true,
  "chart": {
    "base64": "iVBORw0KGgo...",
    "mimeType": "image/png"
  },
  "output": "Chart saved successfully\n"
}
```

**Chart Code Pattern:**
```python
import matplotlib.pyplot as plt
import numpy as np

# Your chart code here
plt.plot(x, y)
plt.xlabel('X Label')
plt.ylabel('Y Label')
plt.title('Chart Title')

# No need to call plt.savefig() - done automatically
```

---

### Data Analysis

#### Analyze Structured Data
```
POST /code-interpreter/analyze
```

**Body:**
```json
{
  "data": [
    {"name": "Alice", "age": 25, "score": 85},
    {"name": "Bob", "age": 30, "score": 92},
    {"name": "Charlie", "age": 35, "score": 78}
  ],
  "analysisType": "summary"
}
```

**Analysis Types:**
- `summary` - Descriptive statistics, data types, missing values
- `correlation` - Correlation matrix for numeric columns
- `stats` - Detailed statistics (mean, median, std, min, max)

**Response:**
```json
{
  "success": true,
  "output": "\nData Summary:\n       age     score\ncount  3.0      3.0\nmean  30.0     85.0\n...",
  "executionTime": 234
}
```

---

### Mathematical Computations

#### Quick Math Evaluation
```
POST /code-interpreter/math
```

**Body:**
```json
{
  "expression": "math.sqrt(144) + np.pi"
}
```

**Response:**
```json
{
  "success": true,
  "output": "Result: 15.141592653589793\n",
  "executionTime": 98
}
```

---

### Package Management

#### Install Python Package
```
POST /code-interpreter/install
```

**Body:**
```json
{
  "package": "numpy"
}
```

**Allowed Packages:**
- `numpy` - Numerical computing
- `pandas` - Data analysis
- `matplotlib` - Plotting
- `seaborn` - Statistical visualization
- `scipy` - Scientific computing
- `sklearn` - Machine learning
- `math` - Mathematical functions
- `statistics` - Statistical functions
- `json`, `csv` - Data formats
- `datetime` - Date/time handling
- `random` - Random number generation

**Response:**
```json
{
  "success": true,
  "output": "Successfully installed numpy-1.24.0\n"
}
```

---

### Execution History

#### Get Recent Executions
```
GET /code-interpreter/history?limit=10
```

**Response:**
```json
{
  "history": [
    {
      "timestamp": "2026-01-25T12:34:56Z",
      "type": "python",
      "code": "print('hello')",
      "success": true
    }
  ]
}
```

---

### Health Check

#### Check Service Status
```
GET /code-interpreter/health
```

**Response:**
```json
{
  "status": "healthy",
  "python": {
    "available": true,
    "version": "Python 3.11.0"
  },
  "config": {
    "pythonTimeout": 30000,
    "javascriptTimeout": 10000,
    "maxOutputSize": 1048576
  }
}
```

---

### Code Examples

#### Get Example Gallery
```
GET /code-interpreter/examples
```

Returns a collection of example code snippets for both Python and JavaScript.

---

## 🤖 Using Code Interpreter with LLMs

The code interpreter is integrated into the tool registry, so LLMs can use it automatically:

### Available Code Tools

1. **code_execute_python** - Execute Python code
2. **code_execute_javascript** - Execute JavaScript code
3. **code_generate_chart** - Generate matplotlib charts
4. **code_analyze_data** - Analyze datasets with pandas

### Example: LLM Using Code Tools

```javascript
const toolRegistry = require('./src/services/tool-registry');
const llm = require('./src/services/llm-enhanced');

const codeTools = toolRegistry.getToolDefinitions([
  'code_execute_python',
  'code_generate_chart',
  'code_analyze_data',
]);

const response = await llm.callWithTools({
  provider: 'anthropic',
  messages: [
    {
      role: 'user',
      content: 'Analyze this sales data and create a bar chart: [{month: "Jan", sales: 1200}, {month: "Feb", sales: 1500}, {month: "Mar", sales: 1300}]',
    },
  ],
  tools: codeTools,
}, {
  code_execute_python: toolRegistry.getTool('code_execute_python').handler,
  code_generate_chart: toolRegistry.getTool('code_generate_chart').handler,
  code_analyze_data: toolRegistry.getTool('code_analyze_data').handler,
});

// LLM will automatically:
// 1. Use code_analyze_data to get statistics
// 2. Use code_generate_chart to create the visualization
// 3. Return insights in natural language
```

---

## 📊 Use Cases

### 1. Data Science & Analysis

```javascript
// Agent automatically analyzes CSV data
await llm.callWithTools({
  messages: [{
    role: 'user',
    content: 'Analyze this customer data and find patterns: [data...]'
  }],
  tools: ['code_execute_python', 'code_analyze_data'],
}, handlers);
```

### 2. Mathematical Computations

```javascript
// Complex calculations
const { data } = await axios.post('/code-interpreter/python', {
  code: `
import numpy as np
from scipy import stats

# Statistical analysis
data = [23, 45, 56, 78, 12, 34, 56, 78, 90, 12]
mean = np.mean(data)
median = np.median(data)
std = np.std(data)
confidence = stats.t.interval(0.95, len(data)-1, mean, stats.sem(data))

print(f"Mean: {mean:.2f}")
print(f"Median: {median:.2f}")
print(f"Std Dev: {std:.2f}")
print(f"95% Confidence Interval: {confidence}")
  `,
});
```

### 3. Data Visualization

```javascript
// Generate business intelligence charts
const { data } = await axios.post('/code-interpreter/chart', {
  code: `
import pandas as pd

# Revenue by quarter
quarters = ['Q1', 'Q2', 'Q3', 'Q4']
revenue = [125000, 150000, 145000, 180000]
expenses = [95000, 110000, 105000, 125000]

x = np.arange(len(quarters))
width = 0.35

fig, ax = plt.subplots(figsize=(10, 6))
ax.bar(x - width/2, revenue, width, label='Revenue', color='#2ecc71')
ax.bar(x + width/2, expenses, width, label='Expenses', color='#e74c3c')

ax.set_xlabel('Quarter')
ax.set_ylabel('Amount ($)')
ax.set_title('Quarterly Financial Performance')
ax.set_xticks(x)
ax.set_xticklabels(quarters)
ax.legend()
ax.grid(True, alpha=0.3, axis='y')
  `,
});

// Use the base64 image
const chartImage = `data:image/png;base64,${data.chart.base64}`;
```

### 4. Algorithm Testing

```javascript
// Test sorting algorithms
const { data } = await axios.post('/code-interpreter/javascript', {
  code: `
function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

const unsorted = [64, 34, 25, 12, 22, 11, 90];
const sorted = quickSort(unsorted);

console.log("Unsorted:", unsorted);
console.log("Sorted:", sorted);

return { unsorted, sorted };
  `,
});
```

### 5. Machine Learning

```javascript
// Simple ML model
const { data } = await axios.post('/code-interpreter/python', {
  code: `
from sklearn.linear_model import LinearRegression
import numpy as np

# Sample data: hours studied vs exam score
X = np.array([[1], [2], [3], [4], [5], [6], [7], [8]])
y = np.array([50, 55, 65, 70, 80, 85, 90, 95])

# Train model
model = LinearRegression()
model.fit(X, y)

# Predict
hours_studied = 5.5
predicted_score = model.predict([[hours_studied]])[0]

print(f"Coefficient: {model.coef_[0]:.2f}")
print(f"Intercept: {model.intercept_:.2f}")
print(f"Predicted score for {hours_studied} hours: {predicted_score:.2f}")
  `,
});
```

---

## 🔒 Security Best Practices

### Allowed Operations

✅ **Safe:**
- Mathematical computations
- Data analysis and transformation
- Chart generation
- Statistical analysis
- Algorithm implementation
- Text processing

### Restricted Operations

❌ **Blocked:**
- File system writes (outside temp directory)
- Network requests (HTTP, sockets)
- System commands (os.system, subprocess)
- Infinite loops (timeout protection)
- Excessive memory usage (limit: 512MB)
- Installing arbitrary packages (whitelist only)

### Timeout Configuration

```javascript
// Python: 30 second default
{
  timeout: 30000
}

// JavaScript: 10 second default
{
  timeout: 10000
}

// Custom timeout
{
  timeout: 60000  // 1 minute
}
```

### Output Size Limits

Maximum output: **1MB**

If output exceeds limit, the execution is terminated:
```json
{
  "success": false,
  "error": {
    "type": "ExecutionError",
    "message": "Output size limit exceeded"
  }
}
```

---

## ⚡ Performance Tips

### 1. Reuse Expensive Imports

```python
# Bad: Import in every execution
import pandas as pd
df = pd.DataFrame(data)

# Good: Imports are cached per execution
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# All data processing here
```

### 2. Use Vectorized Operations

```python
# Bad: Loops
result = []
for x in range(1000):
    result.append(x ** 2)

# Good: Vectorized with numpy
import numpy as np
result = np.arange(1000) ** 2
```

### 3. Limit Data Size

```python
# For large datasets, sample first
df = pd.DataFrame(large_data)
sample = df.sample(n=1000)  # Work with sample
```

### 4. Set Appropriate Timeouts

```javascript
// Fast operations
{ timeout: 5000 }

// Data analysis
{ timeout: 30000 }

// Complex computations
{ timeout: 60000 }
```

---

## 🧪 Testing

### Manual Testing

```bash
# Test Python execution
curl -X POST http://localhost:8080/code-interpreter/python \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"Hello from Python!\")"}'

# Test JavaScript execution
curl -X POST http://localhost:8080/code-interpreter/javascript \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"console.log(\"Hello from JS!\"); return 42;"}'

# Test chart generation
curl -X POST http://localhost:8080/code-interpreter/chart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"plt.plot([1,2,3],[1,4,9])\nplt.title(\"Test Chart\")"}'
```

### Integration Tests

Create `test-code-interpreter.js`:

```javascript
const axios = require('axios');
const assert = require('assert');

async function testCodeInterpreter() {
  const base = 'http://localhost:8080/code-interpreter';
  const headers = { 'Authorization': `Bearer ${process.env.SUPABASE_KEY}` };

  // Test Python execution
  const { data: pythonResult } = await axios.post(`${base}/python`, {
    code: 'result = 2 + 2\nprint(f"Result: {result}")',
  }, { headers });

  assert.strictEqual(pythonResult.success, true);
  assert(pythonResult.output.includes('Result: 4'));

  // Test JavaScript execution
  const { data: jsResult } = await axios.post(`${base}/javascript`, {
    code: 'const x = 10; const y = 20; return x + y;',
  }, { headers });

  assert.strictEqual(jsResult.success, true);
  assert.strictEqual(jsResult.returnValue, 30);

  // Test data analysis
  const { data: analysisResult } = await axios.post(`${base}/analyze`, {
    data: [
      { name: 'Alice', score: 85 },
      { name: 'Bob', score: 92 },
    ],
    analysisType: 'summary',
  }, { headers });

  assert.strictEqual(analysisResult.success, true);
  assert(analysisResult.output.includes('score'));

  console.log('✅ All code interpreter tests passed!');
}

testCodeInterpreter().catch(console.error);
```

---

## 🐛 Troubleshooting

### Python Not Found

**Error:** `python3: command not found`

**Solution:**
```bash
# Ubuntu/Debian
sudo apt install python3

# macOS
brew install python3

# Verify
python3 --version
```

### Package Import Errors

**Error:** `ModuleNotFoundError: No module named 'pandas'`

**Solution:**
```bash
pip3 install pandas numpy matplotlib seaborn scipy scikit-learn
```

### Timeout Errors

**Error:** `TimeoutError: Execution timeout exceeded`

**Solution:**
- Increase timeout in request: `{ timeout: 60000 }`
- Optimize code to run faster
- Use smaller datasets

### Memory Errors

**Error:** `MemoryError` or process killed

**Solution:**
- Reduce data size
- Use sampling for large datasets
- Optimize memory usage (del unused variables)

### Chart Not Generated

**Error:** Chart endpoint returns empty result

**Solution:**
- Ensure matplotlib is installed: `pip3 install matplotlib`
- Check that code includes plotting commands
- Don't call `plt.show()` or `plt.savefig()` - done automatically

---

## 📚 Additional Resources

- [NumPy Documentation](https://numpy.org/doc/)
- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [Matplotlib Gallery](https://matplotlib.org/stable/gallery/)
- [Seaborn Tutorial](https://seaborn.pydata.org/tutorial.html)
- [Scikit-learn Guide](https://scikit-learn.org/stable/user_guide.html)
- [Python VM2 Documentation](https://github.com/patriksimek/vm2)

---

## 🎉 Summary

OMEGA Brain now has **powerful code execution capabilities**! You can:

✅ Execute Python code for data analysis
✅ Run JavaScript in sandboxed VM
✅ Generate charts and visualizations
✅ Perform mathematical computations
✅ Analyze datasets with pandas
✅ Let LLMs write and execute code
✅ Build data-driven workflows

**Next Steps:**
1. Install Python 3 and packages
2. Test endpoints with examples
3. Integrate with LLM tools
4. Build data analysis agents!

---

*Code Interpreter powered by Python 3 + vm2* 🐍💻
*Safe, sandboxed execution for AI agents!* 🔒🤖
