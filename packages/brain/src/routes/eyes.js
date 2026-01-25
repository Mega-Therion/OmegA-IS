const express = require('express');
const router = express.Router();
const { captureScreen, analyzeScreen } = require('../services/eyes');
const fs = require('fs');
const path = require('path');

// List all captures
router.get('/', (req, res) => {
    const capturesDir = path.join(__dirname, '..', '..', 'public', 'captures');
    if (!fs.existsSync(capturesDir)) return res.json({ captures: [] });

    const files = fs.readdirSync(capturesDir)
        .filter(f => f.match(/\.(png|jpg|jpeg)$/i))
        .sort((a, b) => fs.statSync(path.join(capturesDir, b)).mtimeMs - fs.statSync(path.join(capturesDir, a)).mtimeMs);

    res.json({ captures: files });
});

// Just capture
router.post('/capture', async (req, res) => {
    try {
        const result = await captureScreen();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Capture and Analyze
router.post('/analyze', async (req, res) => {
    try {
        const result = await analyzeScreen();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
