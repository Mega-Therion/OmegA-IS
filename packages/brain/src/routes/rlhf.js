const express = require('express');
const requireAuth = require('../middleware/auth');
const rlhf = require('../services/rlhf');

const router = express.Router();

router.get('/experiments', requireAuth, async (req, res) => {
  try {
    const experiments = await rlhf.listExperiments();
    res.json({ ok: true, experiments });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/experiments', requireAuth, async (req, res) => {
  try {
    const experiment = await rlhf.createExperiment(req.body || {});
    res.json({ ok: true, experiment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/assign', requireAuth, async (req, res) => {
  try {
    const { experimentId } = req.body || {};
    const userId = req.authUser?.id || 'anonymous';
    const assignment = await rlhf.assignVariant({ experimentId, userId });
    res.json({ ok: true, assignment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/feedback', requireAuth, async (req, res) => {
  try {
    const { experimentId, variant, score, metadata } = req.body || {};
    const userId = req.authUser?.id || 'anonymous';
    const entry = await rlhf.recordFeedback({
      experimentId,
      userId,
      variant,
      score,
      metadata,
    });
    res.json({ ok: true, entry });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/feedback/summary', requireAuth, async (req, res) => {
  try {
    const summary = await rlhf.feedbackSummary(req.query.experimentId);
    res.json({ ok: true, summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
