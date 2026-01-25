const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../services/supabase');
const mem0 = require('../services/mem0');
const advancedMemory = require('../services/advanced-memory');
const { toLimit } = require('../utils/helpers');

// Create a memory in Supabase: POST /memories { content, tags?, metadata?, source? }
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content, tags, metadata, source } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const memoryPayload = {
      owner_id: req.authUser.id,
      user_id: req.authUser.id,
      content,
      tags: tags || [],
      metadata: metadata || {},
    };

    const { data: memory, error: memoryError } = await supabase
      .from('memories')
      .insert([memoryPayload])
      .select()
      .single();

    if (memoryError) {
      console.error(memoryError);
      return res.status(500).json({ error: memoryError.message });
    }

    let sourceResult = null;
    if (source && source.source_type) {
      const sourcePayload = {
        memory_id: memory.id,
        owner_id: req.authUser.id,
        source_type: source.source_type,
        source_ref: source.source_ref || null,
        tool: source.tool || null,
        confidence: source.confidence ?? null,
        metadata: source.metadata || {},
      };

      const { data: sourceData, error: sourceError } = await supabase
        .from('memory_sources')
        .insert([sourcePayload])
        .select()
        .single();

      if (sourceError) {
        console.error(sourceError);
        sourceResult = { error: sourceError.message };
      } else {
        sourceResult = sourceData;
      }
    }

    res.json({ ok: true, memory, source: sourceResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// List memories: GET /memories?limit=50
router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = toLimit(req.query.limit);
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('owner_id', req.authUser.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, memories: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Search memories: GET /memories/search?q=term&limit=25
router.get('/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) {
      return res.status(400).json({ error: 'q is required' });
    }

    const limit = toLimit(req.query.limit, 25, 100);
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('owner_id', req.authUser.id)
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, memories: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Update memory: PATCH /memories/:id { content?, tags?, metadata?, reason? }
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, tags, metadata, reason } = req.body;

    const hasContent = Object.prototype.hasOwnProperty.call(req.body, 'content');
    const hasTags = Object.prototype.hasOwnProperty.call(req.body, 'tags');
    const hasMetadata = Object.prototype.hasOwnProperty.call(req.body, 'metadata');

    if (!hasContent && !hasTags && !hasMetadata) {
      return res.status(400).json({ error: 'content, tags, or metadata is required' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('memories')
      .select('*')
      .eq('id', id)
      .eq('owner_id', req.authUser.id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'memory not found' });
    }

    const updatePayload = {
      content: hasContent ? content : existing.content,
      tags: hasTags ? tags : existing.tags,
      metadata: hasMetadata ? metadata : existing.metadata,
    };

    const { data: updated, error: updateError } = await supabase
      .from('memories')
      .update(updatePayload)
      .eq('id', id)
      .eq('owner_id', req.authUser.id)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ error: updateError.message });
    }

    const revisionPayload = {
      memory_id: id,
      owner_id: req.authUser.id,
      previous_content: existing.content,
      new_content: updated.content,
      reason: reason || null,
    };

    await supabase.from('memory_revisions').insert([revisionPayload]);

    res.json({ ok: true, memory: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Vote on memory: POST /memories/:id/vote { vote: 1|-1 }
router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const vote = Number(req.body.vote);
    if (![1, -1].includes(vote)) {
      return res.status(400).json({ error: 'vote must be 1 or -1' });
    }

    const payload = {
      memory_id: id,
      owner_id: req.authUser.id,
      vote,
    };

    const { data, error } = await supabase
      .from('memory_votes')
      .upsert([payload], { onConflict: 'memory_id,owner_id' })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, vote: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// ===========================
// Advanced Memory Features
// ===========================

// Create episodic memory
router.post('/episodes', requireAuth, async (req, res) => {
  try {
    const { memoryIds, summary, tags } = req.body || {};
    const episode = await advancedMemory.createEpisode({
      ownerId: req.authUser.id,
      memoryIds,
      summary,
      tags,
    });
    res.json({ ok: true, episode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consolidate memories
router.post('/consolidate', requireAuth, async (req, res) => {
  try {
    const { olderThanDays, limit } = req.body || {};
    const result = await advancedMemory.consolidateMemories({
      ownerId: req.authUser.id,
      olderThanDays,
      limit,
    });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prune memories
router.post('/prune', requireAuth, async (req, res) => {
  try {
    const { olderThanDays, limit } = req.body || {};
    const result = await advancedMemory.pruneMemories({
      ownerId: req.authUser.id,
      olderThanDays,
      limit,
    });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Memory provenance
router.get('/:id/provenance', requireAuth, async (req, res) => {
  try {
    const data = await advancedMemory.getProvenance(req.params.id);
    res.json({ ok: true, provenance: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Memory revisions
router.get('/:id/revisions', requireAuth, async (req, res) => {
  try {
    const revisions = await advancedMemory.getRevisions(req.params.id);
    res.json({ ok: true, revisions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore a memory revision
router.post('/:id/restore', requireAuth, async (req, res) => {
  try {
    const { revisionId } = req.body || {};
    const restored = await advancedMemory.restoreRevision({
      ownerId: req.authUser.id,
      memoryId: req.params.id,
      revisionId,
    });
    res.json({ ok: true, memory: restored });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
