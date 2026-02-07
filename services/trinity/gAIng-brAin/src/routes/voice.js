const express = require('express');
const router = express.Router();
const { speak } = require('../services/voice');

router.post('/speak', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'No text provided' });

        const audioBuffer = await speak(text);
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength
        });
        res.send(Buffer.from(audioBuffer));
    } catch (err) {
        console.error('[Voice Route] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
