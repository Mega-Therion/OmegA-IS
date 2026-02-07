const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../services/supabase');
const fs = require('fs').promises;
const path = require('path');

const LOG_FILE = 'log.md';

router.post('/intake', requireAuth, async (req, res) => {
  try {
    const { message, priority, complexity } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const isComplex = complexity === 'complex' || 
      complexity === 'epic' ||
      message.length > 200 ||
      /\b(and|then|also|multiple|several)\b/i.test(message);

    const taskPayload = {
      title: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      description: message,
      source_message: message,
      status: isComplex ? 'planning' : 'pending',
      priority: priority || 'medium',
      complexity: complexity || (isComplex ? 'complex' : 'medium'),
      created_by: 'safa'
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([taskPayload])
      .select()
      .single();

    if (error) {
      console.error('Failed to create task:', error);
      return res.status(500).json({ error: error.message });
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const logEntry = `- ${timestamp} [SAFA] New task received: ${task.title} (${task.id})\n`;
    await fs.appendFile(LOG_FILE, logEntry).catch(() => {});

    res.json({
      ok: true,
      task,
      message: isComplex
        ? 'Task queued for planning - orchestrator will break it down'
        : 'Task queued for assignment'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
