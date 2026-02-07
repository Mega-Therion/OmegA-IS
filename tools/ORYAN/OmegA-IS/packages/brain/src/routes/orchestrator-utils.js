const express = require('express');
const requireAuth = require('../middleware/auth');
const utils = require('../services/orchestrator-utils');

const router = express.Router();

router.post('/embeddings', requireAuth, async (req, res) => {
  try {
    const { texts } = req.body || {};
    if (!Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts array required' });
    }
    const embeddings = await utils.generateEmbeddings(texts);
    res.json({ embeddings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/utilities', requireAuth, async (req, res) => {
  try {
    const { type, content, agents } = req.body || {};
    if (!type || !content) {
      return res.status(400).json({ error: 'type and content required' });
    }
    if (type === 'route_agent') {
      const result = await utils.routeAgent(content, agents || []);
      return res.json({ result });
    }
    if (type === 'generate_title') {
      const result = await utils.generateTitle(content);
      return res.json({ result });
    }
    return res.status(400).json({ error: 'unknown utility type' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
