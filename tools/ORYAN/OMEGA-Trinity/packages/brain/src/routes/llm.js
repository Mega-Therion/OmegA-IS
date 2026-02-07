const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { getLlmStatus, callLlm } = require('../services/llm');
const { normalizeChatRequest } = require('../utils/helpers');

// LLM status (OpenAI/Azure)
router.get('/status', requireAuth, (req, res) => {
  const status = getLlmStatus();
  res.json({ ok: status.ready, status });
});

// LLM chat proxy (OpenAI/Azure)
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const status = getLlmStatus();
    if (!status.ready) {
      return res.status(503).json({ error: 'llm not configured', status });
    }

    const normalized = normalizeChatRequest(req.body);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }

    const data = await callLlm(normalized);
    const choice = data?.choices?.[0]?.message || null;
    res.json({
      ok: true,
      provider: status.provider,
      response: choice,
      choices: choice ? [{ message: choice }] : [],
      raw: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'llm request failed' });
  }
});

module.exports = router;
