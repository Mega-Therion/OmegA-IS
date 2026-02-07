const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { generateImage } = require('../services/image-generation');

router.post('/image', requireAuth, async (req, res) => {
  try {
    const { prompt, model, size } = req.body || {};
    const result = await generateImage(prompt, { model, size });
    res.json({ ok: true, image: result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
