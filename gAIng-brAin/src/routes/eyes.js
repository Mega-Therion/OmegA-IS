const express = require('express');
const router = express.Router();
const { captureScreen, analyzeScreen } = require('../services/eyes');

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
