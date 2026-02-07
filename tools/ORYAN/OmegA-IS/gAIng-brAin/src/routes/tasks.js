const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const queue = require('../services/queue');
const { sanitizeString, isValidAgentName, isValidUUID } = require('../utils/helpers');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: () => require('crypto').randomUUID() } : require('uuid');

// POST /tasks - Enqueue a task
// Body: { type, priority: 1-10, sender, intent, data, deadline? }
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!queue.enabled) {
      return res.status(503).json({ error: 'task queue not configured; set REDIS_URL' });
    }

    const type = sanitizeString(req.body.type, 50) || 'default';
    const sender = sanitizeString(req.body.sender, 100);
    const intent = sanitizeString(req.body.intent, 100);
    const { priority, data, deadline } = req.body;

    if (!sender || !intent) {
      return res.status(400).json({ error: 'sender and intent are required' });
    }

    if (!isValidAgentName(sender)) {
      return res.status(400).json({ error: 'invalid sender name format' });
    }

    const task = {
      id: require('crypto').randomUUID(),
      type,
      priority: Math.min(10, Math.max(1, priority || 5)),
      sender,
      intent,
      data: data || {},
      deadline: deadline ? new Date(deadline) : null,
      created_at: new Date(),
    };

    await queue.enqueue(task);
    res.json({ ok: true, task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/queue/:type - Get next task from queue
router.get('/queue/:type', requireAuth, async (req, res) => {
  try {
    if (!queue.enabled) {
      return res.status(503).json({ error: 'task queue not configured' });
    }

    const { type } = req.params;
    const task = await queue.dequeue(type);

    res.json({ ok: true, task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/urgent/:type - Get urgent tasks (deadline within N seconds)
router.get('/urgent/:type', requireAuth, async (req, res) => {
  try {
    if (!queue.enabled) {
      return res.status(503).json({ error: 'task queue not configured' });
    }

    const { type } = req.params;
    const withinSeconds = parseInt(req.query.within || '300');
    const urgent = await queue.getUrgent(type, withinSeconds);

    res.json({ ok: true, tasks: urgent, count: urgent.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /tasks/:id/complete - Mark task as complete
// Body: { result }
router.post('/:id/complete', requireAuth, async (req, res) => {
  try {
    if (!queue.enabled) {
      return res.status(503).json({ error: 'task queue not configured' });
    }

    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'invalid task id format' });
    }

    const { result } = req.body;

    await queue.complete(id, result || {});
    res.json({ ok: true, task_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:id/result - Get task result
router.get('/:id/result', requireAuth, async (req, res) => {
  try {
    if (!queue.enabled) {
      return res.status(503).json({ error: 'task queue not configured' });
    }

    const { id } = req.params;
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'invalid task id format' });
    }

    const result = await queue.getResult(id);

    res.json({ ok: true, task_id: id, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/stats/:type - Get queue statistics
router.get('/stats/:type', requireAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const stats = await queue.stats(type);

    res.json({ ok: true, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
