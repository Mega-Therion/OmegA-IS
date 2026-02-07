/**
 * 🔐 Vault & Queue Routes
 * 
 * API endpoints for secrets management and task queue.
 */

const express = require('express');
const router = express.Router();

// Import services
let vault, queue;
try { vault = require('../services/vault'); } catch (e) { vault = null; }
try { queue = require('../services/queue'); } catch (e) { queue = null; }

// Require auth for vault operations
const requireAuth = require('../middleware/auth');

/**
 * GET /vault/status
 * Check vault status (no auth required)
 */
router.get('/vault/status', async (req, res) => {
  if (!vault) {
    return res.status(503).json({ available: false, error: 'Vault service not loaded' });
  }

  try {
    const validation = await vault.vault.validate();
    res.json({
      available: true,
      loaded: vault.vault.loaded,
      keyCount: vault.vault.keys.size,
      ...validation
    });
  } catch (error) {
    res.status(500).json({ available: true, error: error.message });
  }
});

/**
 * GET /vault/keys
 * List all key names (not values)
 */
router.get('/vault/keys', requireAuth, async (req, res) => {
  if (!vault) {
    return res.status(503).json({ error: 'Vault not available' });
  }

  try {
    if (!vault.vault.loaded) {
      await vault.vault.init();
    }
    
    const keys = vault.vault.list();
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /vault/keys
 * Store a new key
 */
router.post('/vault/keys', requireAuth, async (req, res) => {
  if (!vault) {
    return res.status(503).json({ error: 'Vault not available' });
  }

  const { name, value, description, expiresAt, rotateAfter, tags } = req.body;

  if (!name || !value) {
    return res.status(400).json({ error: 'name and value required' });
  }

  try {
    if (!vault.vault.loaded) {
      await vault.vault.init();
    }
    
    await vault.vault.set(name, value, { description, expiresAt, rotateAfter, tags });
    res.json({ success: true, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /vault/keys/:name
 * Get a key value
 */
router.get('/vault/keys/:name', requireAuth, async (req, res) => {
  if (!vault) {
    return res.status(503).json({ error: 'Vault not available' });
  }

  try {
    if (!vault.vault.loaded) {
      await vault.vault.init();
    }
    
    const value = await vault.vault.get(req.params.name);
    
    if (value === null) {
      return res.status(404).json({ error: 'Key not found or expired' });
    }
    
    res.json({ name: req.params.name, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /vault/keys/:name
 * Delete a key
 */
router.delete('/vault/keys/:name', requireAuth, async (req, res) => {
  if (!vault) {
    return res.status(503).json({ error: 'Vault not available' });
  }

  try {
    const deleted = await vault.vault.delete(req.params.name);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /vault/keys/:name/rotate
 * Rotate a key
 */
router.post('/vault/keys/:name/rotate', requireAuth, async (req, res) => {
  if (!vault) {
    return res.status(503).json({ error: 'Vault not available' });
  }

  const { newValue } = req.body;

  if (!newValue) {
    return res.status(400).json({ error: 'newValue required' });
  }

  try {
    await vault.vault.rotate(req.params.name, newValue);
    res.json({ success: true, rotated: req.params.name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /vault/audit
 * Get access log
 */
router.get('/vault/audit', requireAuth, async (req, res) => {
  if (!vault) {
    return res.status(503).json({ error: 'Vault not available' });
  }

  const limit = parseInt(req.query.limit) || 100;
  res.json({ log: vault.vault.getAccessLog(limit) });
});

// ============ QUEUE ROUTES ============

/**
 * GET /queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', async (req, res) => {
  if (!queue?.taskQueue) {
    return res.status(503).json({ available: false, error: 'Queue not available' });
  }

  try {
    const stats = await queue.taskQueue.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /queue/jobs
 * Enqueue a new job
 */
router.post('/queue/jobs', requireAuth, async (req, res) => {
  if (!queue?.taskQueue) {
    return res.status(503).json({ error: 'Queue not available' });
  }

  const { type, data, priority, delay, maxAttempts } = req.body;

  if (!type || !data) {
    return res.status(400).json({ error: 'type and data required' });
  }

  try {
    const jobId = await queue.taskQueue.enqueue(type, data, { priority, delay, maxAttempts });
    res.json({ success: true, jobId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /queue/jobs/:id
 * Get job status
 */
router.get('/queue/jobs/:id', async (req, res) => {
  if (!queue?.taskQueue) {
    return res.status(503).json({ error: 'Queue not available' });
  }

  try {
    const job = await queue.taskQueue.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /queue/jobs/:id
 * Cancel a job
 */
router.delete('/queue/jobs/:id', requireAuth, async (req, res) => {
  if (!queue?.taskQueue) {
    return res.status(503).json({ error: 'Queue not available' });
  }

  try {
    const cancelled = await queue.taskQueue.cancelJob(req.params.id);
    res.json({ success: cancelled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /queue/pending
 * Get pending jobs
 */
router.get('/queue/pending', async (req, res) => {
  if (!queue?.taskQueue) {
    return res.status(503).json({ error: 'Queue not available' });
  }

  try {
    const jobs = await queue.taskQueue.getPendingJobs();
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /queue/start
 * Start queue processing
 */
router.post('/queue/start', requireAuth, async (req, res) => {
  if (!queue?.taskQueue) {
    return res.status(503).json({ error: 'Queue not available' });
  }

  queue.taskQueue.start();
  res.json({ success: true, message: 'Queue processing started' });
});

/**
 * POST /queue/stop
 * Stop queue processing
 */
router.post('/queue/stop', requireAuth, async (req, res) => {
  if (!queue?.taskQueue) {
    return res.status(503).json({ error: 'Queue not available' });
  }

  queue.taskQueue.stop();
  res.json({ success: true, message: 'Queue processing stopped' });
});

module.exports = router;
