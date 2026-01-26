const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { intakeTask } = require('../services/task-intake');
const fs = require('fs').promises;
const path = require('path');

const LOG_FILE = 'log.md';

router.post('/intake', requireAuth, async (req, res) => {
  try {
    const { message, priority, complexity } = req.body;
    const { task } = await intakeTask({
      message,
      priority,
      complexity,
      createdBy: 'safa',
      source: 'safa',
    });

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const logEntry = `- ${timestamp} [SAFA] New task received: ${task.title} (${task.id})\n`;
    await fs.appendFile(LOG_FILE, logEntry).catch(() => {});

    res.json({
      ok: true,
      task,
      message: task.status === 'planning'
        ? 'Task queued for planning - orchestrator will break it down'
        : 'Task queued for assignment'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
