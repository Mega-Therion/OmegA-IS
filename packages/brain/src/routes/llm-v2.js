/**
 * OMEGA Brain - Enhanced LLM API Routes (v2)
 *
 * Endpoints:
 * - POST /v2/llm/chat - Standard chat (with caching, tools)
 * - POST /v2/llm/stream - Streaming chat (SSE)
 * - POST /v2/llm/vision - Vision analysis
 * - POST /v2/llm/tools - Chat with tool execution
 */

const express = require('express');
const router = express.Router();
const llm = require('../services/llm-enhanced');
const toolRegistry = require('../services/tool-registry');
const requireAuth = require('../middleware/auth');

// ===========================
// Standard Chat (Non-Streaming)
// ===========================

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const {
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      system,
      tools,
      toolChoice,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await llm.callLlm({
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      system,
      tools,
      toolChoice,
    });

    res.json(response);
  } catch (error) {
    console.error('[LLM v2] Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Streaming Chat (SSE)
// ===========================

router.post('/stream', requireAuth, async (req, res) => {
  try {
    const {
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      system,
      tools,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Start streaming
    const stream = llm.streamLlm({
      messages,
      provider,
      model,
      temperature,
      maxTokens,
      system,
      tools,
    });

    for await (const chunk of stream) {
      // Send SSE event
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);

      if (chunk.done) {
        break;
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('[LLM v2] Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ===========================
// Vision Analysis
// ===========================

router.post('/vision', requireAuth, async (req, res) => {
  try {
    const {
      image,
      imageType,
      prompt,
      provider,
      model,
    } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'image data required' });
    }

    const response = await llm.callVision({
      image,
      imageType,
      prompt,
      provider,
      model,
    });

    res.json(response);
  } catch (error) {
    console.error('[LLM v2] Vision error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Chat with Tool Execution
// ===========================

router.post('/tools', requireAuth, async (req, res) => {
  try {
    const {
      messages,
      tools,
      toolNames,
      provider,
      model,
      temperature,
      maxTokens,
      maxToolIterations,
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const toolDefinitions = tools && Array.isArray(tools)
      ? tools
      : toolRegistry.getToolDefinitions(toolNames);

    if (!toolDefinitions || toolDefinitions.length === 0) {
      return res.status(400).json({ error: 'tools array or toolNames required' });
    }

    const internalHandlers = {};
    toolDefinitions.forEach((tool) => {
      internalHandlers[tool.name] = async (args) => toolRegistry.executeTool(tool.name, args);
    });

    const response = await llm.callWithTools({
      messages,
      tools: toolDefinitions,
      provider,
      model,
      temperature,
      maxTokens,
      maxToolIterations,
    }, internalHandlers);

    res.json(response);
  } catch (error) {
    console.error('[LLM v2] Tools error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================
// Status / Health Check
// ===========================

router.get('/status', (req, res) => {
  const status = llm.getLlmStatus();
  res.json(status);
});

module.exports = router;
