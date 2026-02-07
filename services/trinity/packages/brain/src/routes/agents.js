const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../services/supabase');

// Agent heartbeat
// POST /agents/:id/heartbeat { status: \"online\" | \"busy\" }
router.post('/:id/heartbeat', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from('agents')
      .update({
        status: status || 'online',
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, agent: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Get agent status
// GET /agents
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('id');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, agents: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
