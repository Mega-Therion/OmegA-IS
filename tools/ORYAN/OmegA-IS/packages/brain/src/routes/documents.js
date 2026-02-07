const express = require('express');
const multer = require('multer');
const requireAuth = require('../middleware/auth');
const docProcessor = require('../services/document-processor');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }
    const result = await docProcessor.parsePdf(req.file.buffer);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ocr', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }
    const result = await docProcessor.ocrImage(req.file.buffer);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/summarize', requireAuth, async (req, res) => {
  try {
    const { text, provider } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'text required' });
    }
    const result = await docProcessor.summarizeText(text, { provider });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/qa', requireAuth, async (req, res) => {
  try {
    const { text, question, provider } = req.body || {};
    if (!text || !question) {
      return res.status(400).json({ error: 'text and question required' });
    }
    const result = await docProcessor.answerQuestion(text, question, { provider });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
