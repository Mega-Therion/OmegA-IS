const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../services/supabase');

// Register a member: POST /members { user_id: "alice", display_name: "Alice" }
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      user_id,
      display_name,
      regular_name,
      government_name,
      company,
      key_ref,
      base_url,
      notes,
    } = req.body;

    const finalUserId = user_id || regular_name || req.authUser.id;
    if (!finalUserId) {
      return res.status(400).json({ error: 'user_id or regular_name is required' });
    }

    const payload = {
      user_id: finalUserId,
      owner_id: req.authUser.id,
      display_name: display_name || regular_name || null,
      regular_name: regular_name || display_name || null,
      government_name: government_name || null,
      company: company || null,
      key_ref: key_ref || null,
      base_url: base_url || null,
      notes: notes || null,
    };

    const { data, error } = await supabase
      .from('members')
      .upsert([payload], { onConflict: 'user_id' })
      .select();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    // Fire-and-forget n8n webhook
    const n8nWebhook = process.env.N8N_ONBOARDING_WEBHOOK;
    if (n8nWebhook) {
      // Use native fetch (Node 18+)
      fetch(n8nWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data[0])
      })
      .then(res => {
        if (!res.ok) console.error(`n8n webhook failed: ${res.status} ${res.statusText}`);
        else console.log('n8n onboarding webhook fired successfully');
      })
      .catch(err => console.error('n8n webhook error:', err.message));
    }

    res.json({ ok: true, member: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// List members: GET /members
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('owner_id', req.authUser.id)
      .order('user_id', { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, members: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// List member names only: GET /members/names
router.get('/names', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('user_id,regular_name,display_name')
      .eq('owner_id', req.authUser.id)
      .order('user_id', { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    const names = data.map((row) => row.user_id || row.regular_name || row.display_name);
    res.type('text/plain').send(names.join(', '));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
