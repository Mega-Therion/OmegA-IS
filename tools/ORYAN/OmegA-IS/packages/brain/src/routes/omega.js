const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { getLlmStatus, callLlm } = require('../services/llm');
const { normalizeChatRequest } = require('../utils/helpers');
const { buildOmegaMessages } = require('../services/omega-persona');
const { speak } = require('../services/voice');

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

    const messages = buildOmegaMessages(normalized.messages);
    const data = await callLlm({ ...normalized, messages });
    const choice = data?.choices?.[0]?.message || null;

    res.json({
      ok: true,
      provider: status.provider,
      response: choice,
      choices: choice ? [{ message: choice }] : [],
      raw: data
    });
  } catch (err) {
    console.error('[OmegA Chat] Error:', err);
    res.status(500).json({ error: 'omega chat failed' });
  }
});

router.post('/speak', requireAuth, async (req, res) => {
  try {
    const status = getLlmStatus();
    if (!status.ready) {
      return res.status(503).json({ error: 'llm not configured', status });
    }

    const {
      text: rawText,
      voiceId,
      provider,
      voice,
      modelId,
      stability,
      similarityBoost
    } = req.body || {};

    const textInput = typeof rawText === 'string' ? rawText.trim() : '';
    let responseText = textInput;

    if (!responseText) {
      const normalized = normalizeChatRequest(req.body);
      if (normalized.error) {
        return res.status(400).json({ error: normalized.error });
      }

      const messages = buildOmegaMessages(normalized.messages);
      const data = await callLlm({ ...normalized, messages });
      responseText = data?.choices?.[0]?.message?.content?.trim() || '';
    }

    if (!responseText) {
      return res.status(500).json({ error: 'omega response was empty' });
    }

    const audioBuffer = await speak(responseText, {
      voiceId,
      provider,
      voice,
      modelId,
      stability,
      similarityBoost
    });
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    res.json({
      ok: true,
      text: responseText,
      audioBase64,
      audioContentType: 'audio/mpeg'
    });
  } catch (err) {
    console.error('[OmegA Speak] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
