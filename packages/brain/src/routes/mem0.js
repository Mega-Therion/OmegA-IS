const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const mem0 = require('../services/mem0');

// POST /addMemory  { content: "something", tags: ["genealogy","idea"], metadata?: {} }
router.post('/addMemory', requireAuth, async (req, res) => {
  try {
    if (!mem0) {
      return res.status(503).json({ error: 'mem0 not configured' });
    }

    const { text, content, tags, metadata } = req.body;
    const finalContent = content || text;

    if (!finalContent) {
      return res.status(400).json({ error: 'content is required' });
    }
    const memory = await mem0.add(finalContent, {
      user_id: req.authUser.id,
      tags: tags || [],
      metadata: metadata || {},
    });

    res.json({ ok: true, memory: memory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /searchMemory?q=term
router.get('/searchMemory', requireAuth, async (req, res) => {
  try {
    if (!mem0) {
      return res.status(503).json({ error: 'mem0 not configured' });
    }

    const q = req.query.q;
    const userId = req.authUser.id;
    if (!q) {
      return res.status(400).json({ error: 'q is required' });
    }

    const results = await mem0.search(q, { user_id: userId });

    res.json({ ok: true, results: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
