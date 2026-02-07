const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const fsTools = require('../services/agentic-fs');
const gitTools = require('../services/agentic-git');
const { analyzeFile, analyzeCode } = require('../services/code-analysis');
const { reviewCode } = require('../services/code-review');

router.get('/fs/tree', requireAuth, async (req, res) => {
  try {
    const tree = await fsTools.listDirectory(req.query.path || process.cwd(), {
      depth: req.query.depth,
      includeHidden: req.query.includeHidden === 'true',
    });
    res.json({ ok: true, tree });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/fs/read', requireAuth, async (req, res) => {
  try {
    const file = await fsTools.readFile(req.query.path);
    res.json({ ok: true, file });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/fs/write', requireAuth, async (req, res) => {
  try {
    const { path: filePath, content, append, createDirs } = req.body || {};
    const result = await fsTools.writeFile(filePath, content || '', {
      append,
      createDirs,
    });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/fs/search', requireAuth, async (req, res) => {
  try {
    const { query, path, maxResults } = req.body || {};
    const result = await fsTools.searchFiles(query, { path, maxResults });
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/git/status', requireAuth, async (req, res) => {
  try {
    const status = await gitTools.getStatus();
    res.json({ ok: true, status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/git/diff', requireAuth, async (req, res) => {
  try {
    const diff = await gitTools.getDiff(req.body || {});
    res.json({ ok: true, diff });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/git/log', requireAuth, async (req, res) => {
  try {
    const log = await gitTools.getLog(req.query || {});
    res.json({ ok: true, log });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/git/commit', requireAuth, async (req, res) => {
  try {
    const result = await gitTools.commitChanges(req.body?.message);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { path: filePath, code, language } = req.body || {};
    if (filePath) {
      const analysis = await analyzeFile(filePath);
      return res.json({ ok: true, analysis });
    }
    if (code) {
      const analysis = analyzeCode(code, language);
      return res.json({ ok: true, analysis });
    }
    res.status(400).json({ ok: false, error: 'path or code required' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/review', requireAuth, async (req, res) => {
  try {
    const { code, language, provider, guidance } = req.body || {};
    if (!code) {
      return res.status(400).json({ ok: false, error: 'code required' });
    }
    const review = await reviewCode({ code, language, provider, guidance });
    res.json({ ok: true, review });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
