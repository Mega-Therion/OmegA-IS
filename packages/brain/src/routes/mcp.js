const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { manager } = require('../services/mcp-client');

router.get('/status', requireAuth, (req, res) => {
  res.json({ ok: true, servers: manager.getStatus() });
});

router.get('/tools', requireAuth, async (req, res) => {
  try {
    const server = req.query.server || null;
    const tools = await manager.listTools(server);
    res.json({ ok: true, tools });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/resources', requireAuth, async (req, res) => {
  try {
    const server = req.query.server || null;
    const resources = await manager.listResources(server);
    res.json({ ok: true, resources });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
