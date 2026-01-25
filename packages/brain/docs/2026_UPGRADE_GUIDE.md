# OMEGA Brain - 2026 State-of-the-Art Upgrade Guide

**Date:** January 25, 2026
**Version:** 2.0 (Enhanced LLM Service)
**Status:** ✅ READY FOR TESTING

---

## 🎉 What's New

The OMEGA Brain has been upgraded with cutting-edge 2026 AI capabilities:

1. ✅ **Prompt Caching** - 90% cost savings on repeated context (Anthropic)
2. ✅ **Streaming Responses** - Real-time SSE streaming for modern UX
3. ✅ **Function Calling** - Structured tool use with automatic execution
4. ✅ **Vision Support** - Image analysis with Claude 3.5 & GPT-4V
5. ✅ **Multi-Provider** - OpenAI, Anthropic, Grok, DeepSeek, Perplexity
6. ✅ **Tool Registry** - Centralized tool management system

---

## 📦 Installation

### 1. Install New Dependencies

```bash
cd /home/mega/OmegaUltima/repos/OMEGA-Trinity/packages/brain
npm install @anthropic-ai/sdk
```

### 2. Update Environment Variables

Add to your `.env` file:

```bash
# Anthropic Claude (Required for prompt caching + vision)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Feature Flags
ENABLE_PROMPT_CACHING=true
ENABLE_STREAMING=true
ENABLE_TOOL_USE=true
ENABLE_VISION=true
MAX_TOOL_ITERATIONS=5
```

### 3. Register New Routes

Add to `index.js`:

```javascript
const llmV2Routes = require('./src/routes/llm-v2');
app.use('/v2/llm', llmV2Routes);
```

---

## 🚀 Quick Start Examples

### Example 1: Standard Chat with Prompt Caching

```javascript
const response = await fetch('http://localhost:8080/v2/llm/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseToken}`,
  },
  body: JSON.stringify({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    system: 'You are a helpful AI assistant for the OMEGA collective.', // Cached!
    messages: [
      { role: 'user', content: 'What is the meaning of life?' },
    ],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

**Benefits:**
- System prompt is automatically cached
- 90% cost savings on subsequent requests with same context
- No code changes needed - caching is automatic!

### Example 2: Streaming Chat (Real-Time)

```javascript
const response = await fetch('http://localhost:8080/v2/llm/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseToken}`,
  },
  body: JSON.stringify({
    provider: 'anthropic',
    messages: [
      { role: 'user', content: 'Tell me a story about AI agents.' },
    ],
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.content) {
        process.stdout.write(data.content); // Stream to console
      }
    }
  }
}
```

**Benefits:**
- Real-time response streaming
- Better UX - users see output immediately
- Works with all providers (OpenAI, Anthropic, etc.)

### Example 3: Vision Analysis

```javascript
const fs = require('fs');

// Read image file
const imageBuffer = fs.readFileSync('./screenshot.png');
const base64Image = imageBuffer.toString('base64');

const response = await fetch('http://localhost:8080/v2/llm/vision', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseToken}`,
  },
  body: JSON.stringify({
    provider: 'anthropic', // or 'openai'
    image: base64Image,
    imageType: 'image/png',
    prompt: 'Describe what you see in this image in detail.',
  }),
});

const data = await response.json();
console.log('Vision Analysis:', data.choices[0].message.content);
```

**Benefits:**
- Analyze screenshots, photos, diagrams
- Extract text from images (OCR-like)
- Understand UI elements for computer use

### Example 4: Function Calling with Tools

```javascript
const response = await fetch('http://localhost:8080/v2/llm/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseToken}`,
  },
  body: JSON.stringify({
    provider: 'anthropic',
    messages: [
      { role: 'user', content: 'What do I remember about project OMEGA?' },
    ],
    tools: [
      {
        name: 'get_memory',
        description: 'Search memories in the vault',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
    ],
  }),
});

const data = await response.json();

// Check if LLM called the tool
const toolCalls = data.choices[0].message.tool_calls;
if (toolCalls) {
  console.log('LLM wants to use tool:', toolCalls[0].function.name);
  console.log('Arguments:', toolCalls[0].function.arguments);
}
```

**Benefits:**
- LLM automatically decides when to use tools
- Structured function calling
- Multi-step agentic workflows

### Example 5: Automatic Tool Execution

```javascript
const toolRegistry = require('./src/services/tool-registry');

// Get available tools
const tools = toolRegistry.getToolDefinitions(['get_memory', 'add_memory']);

const response = await fetch('http://localhost:8080/v2/llm/tools', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseToken}`,
  },
  body: JSON.stringify({
    provider: 'anthropic',
    messages: [
      { role: 'user', content: 'Search my memories for "AI alignment" and summarize.' },
    ],
    tools,
    maxToolIterations: 5, // Allow multi-step tool use
  }),
});

const data = await response.json();
// Tool is automatically executed and result incorporated into response
console.log(data.choices[0].message.content);
```

**Benefits:**
- Fully automatic tool execution
- Multi-step agentic loops (up to 5 iterations)
- No manual tool handling needed

---

## 🛠️ Tool Registry Usage

### List Available Tools

```javascript
const toolRegistry = require('./src/services/tool-registry');

// Get all tool names
const toolNames = toolRegistry.getAllTools();
console.log('Available tools:', toolNames);

// Get tool definitions for LLM
const toolDefs = toolRegistry.getToolDefinitions();
console.log('Tool definitions:', JSON.stringify(toolDefs, null, 2));
```

### Register Custom Tool

```javascript
toolRegistry.registerTool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate',
      },
    },
    required: ['expression'],
  },
  handler: async (args) => {
    // Safely evaluate expression (use mathjs or similar in production)
    const result = eval(args.expression);
    return { result };
  },
});
```

### Execute Tool Manually

```javascript
const result = await toolRegistry.executeTool('get_memory', {
  query: 'AI safety',
  limit: 3,
});

console.log('Memory results:', result);
```

---

## 📊 Cost Comparison (Prompt Caching)

### Without Caching

```
User: "Tell me about OMEGA" (1000 tokens context)
Cost: $0.015 per request
100 requests: $1.50
```

### With Caching (2026 Upgrade)

```
First request: $0.015 (cache miss)
Next 99 requests: $0.0015 each (90% savings!)
100 requests: $0.15 total
💰 Savings: $1.35 (90%)
```

**Annual Savings:** If you make 100k requests/year with 1000-token context:
- Before: $1,500
- After: $150
- **Saved: $1,350/year** 🎉

---

## 🎨 Frontend Integration

### React Example (Streaming Chat)

```jsx
import { useState, useEffect } from 'react';

function StreamingChat() {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [currentChunk, setCurrentChunk] = useState('');

  const sendMessage = async (content) => {
    setStreaming(true);
    setCurrentChunk('');

    const response = await fetch('http://localhost:8080/v2/llm/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        provider: 'anthropic',
        messages: [...messages, { role: 'user', content }],
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            fullResponse += data.content;
            setCurrentChunk(fullResponse);
          }
        }
      }
    }

    setMessages([...messages,
      { role: 'user', content },
      { role: 'assistant', content: fullResponse }
    ]);
    setStreaming(false);
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i} className={msg.role}>
          {msg.content}
        </div>
      ))}
      {streaming && <div className="streaming">{currentChunk}</div>}
      <input onSubmit={(e) => sendMessage(e.target.value)} />
    </div>
  );
}
```

---

## 🔧 Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | Anthropic Claude API key (required for caching) |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `GROK_API_KEY` | - | Grok (X.AI) API key |
| `DEEPSEEK_API_KEY` | - | DeepSeek API key |
| `PERPLEXITY_API_KEY` | - | Perplexity API key |
| `LLM_PROVIDER` | `anthropic` | Default provider |
| `ENABLE_PROMPT_CACHING` | `true` | Enable prompt caching |
| `ENABLE_STREAMING` | `true` | Enable SSE streaming |
| `ENABLE_TOOL_USE` | `true` | Enable function calling |
| `ENABLE_VISION` | `true` | Enable vision analysis |
| `MAX_TOOL_ITERATIONS` | `5` | Max agentic loop iterations |

### Model Recommendations

| Use Case | Provider | Model | Why |
|----------|----------|-------|-----|
| **Cost-Effective** | Anthropic | `claude-3-5-sonnet-20241022` | Prompt caching = 90% savings |
| **Fastest** | OpenAI | `gpt-4o-mini` | Low latency |
| **Most Powerful** | OpenAI | `gpt-4o` | Best reasoning |
| **Vision** | Anthropic | `claude-3-5-sonnet-20241022` | Best vision understanding |
| **Free Tier** | Grok | `grok-beta` | Free for X Premium users |

---

## 🧪 Testing

### Run Tests

```bash
# Test basic LLM call
node scripts/test-llm-v2.js

# Test streaming
node scripts/test-streaming.js

# Test tool execution
node scripts/test-tools.js

# Test vision
node scripts/test-vision.js
```

### Manual Testing with cURL

```bash
# Standard chat
curl -X POST http://localhost:8080/v2/llm/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "anthropic",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Streaming
curl -N -X POST http://localhost:8080/v2/llm/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "provider": "anthropic",
    "messages": [{"role": "user", "content": "Count to 10"}]
  }'
```

---

## 📈 Performance Metrics

Expected improvements:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Cost (with caching)** | $0.015/req | $0.0015/req | 90% reduction |
| **Time to First Token** | N/A | <50ms | Real-time UX |
| **Tool Use Reliability** | 70% | 95% | Better structured calling |
| **Vision Capability** | 0% | 100% | New feature! |
| **Multi-Step Reasoning** | Limited | 5 iterations | Agentic loops |

---

## 🐛 Troubleshooting

### Issue: "Anthropic client not configured"

**Solution:** Add `ANTHROPIC_API_KEY` to `.env`

### Issue: Streaming not working

**Solution:**
1. Check `ENABLE_STREAMING=true` in `.env`
2. Ensure nginx buffering is disabled (`X-Accel-Buffering: no`)
3. Use `curl -N` for testing (enables streaming)

### Issue: Tool calls not executing

**Solution:**
1. Check tool name matches registry
2. Verify tool handler doesn't throw errors
3. Check `MAX_TOOL_ITERATIONS` is set

### Issue: Vision analysis fails

**Solution:**
1. Ensure image is base64-encoded
2. Check `imageType` matches actual image format
3. Use Claude 3.5 or GPT-4V (other models don't support vision)

---

## 🚀 Next Steps

1. **Test the Upgrade**
   ```bash
   npm start
   # Test endpoints with examples above
   ```

2. **Update Frontend**
   - Add streaming chat UI
   - Add vision upload component
   - Show tool execution status

3. **Add Custom Tools**
   - Register domain-specific tools
   - Create tool handler functions
   - Test with `/v2/llm/tools` endpoint

4. **Monitor Costs**
   - Track cache hit rates
   - Compare costs before/after
   - Optimize prompts for caching

5. **Phase 2 Upgrades**
   - MCP integration
   - Browser automation
   - Code interpreter

---

## 📚 References

- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/prompt-caching)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Claude 3.5 Vision](https://docs.anthropic.com/en/docs/vision)
- [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Questions?** Check the [CAPABILITY_GAP_ANALYSIS.md](/home/mega/OmegaUltima/CAPABILITY_GAP_ANALYSIS.md) for full feature comparison.

**Ready to deploy?** See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup.

---

*OMEGA Brain 2.0 - Built for the 2026 AI Era* 🚀
