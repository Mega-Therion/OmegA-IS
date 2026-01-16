const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const wsManager = require('../services/websocket');

// GET /ws - Upgrade to WebSocket
// Connect as: ws://localhost:8080/ws?agent=Claude
// Messages received: { id, sender, recipient, intent, data, created_at, read_at }
router.get('/', (req, res) => {
  const agentName = req.query.agent || 'unknown';

  // Verify agent exists (optional, skip for now)
  // Check supabase.members for validity

  res.status(101);

  // Express 5.x handles WebSocket upgrade differently; this is a placeholder
  // In practice, use ws library with http.createServer or express-ws middleware
  res.json({ error: 'WebSocket upgrade not directly supported via router. Use express-ws or setup HTTP upgrade handler in index.js' });
});

module.exports = router;
