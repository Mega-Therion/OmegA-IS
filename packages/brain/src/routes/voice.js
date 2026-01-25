const express = require('express');
const router = express.Router();
const multer = require('multer');
const { speak, cloneVoice } = require('../services/voice');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/speak', async (req, res) => {
    try {
        const {
            text,
            voiceId,
            provider,
            voice,
            modelId,
            stability,
            similarityBoost
        } = req.body || {};

        if (!text) return res.status(400).json({ error: 'No text provided' });

        const audioBuffer = await speak(text, {
            voiceId,
            provider,
            voice,
            modelId,
            stability,
            similarityBoost
        });
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

router.post('/clone', upload.array('files', 5), async (req, res) => {
    try {
        const { name, description } = req.body || {};
        const result = await cloneVoice({ name, description, files: req.files || [] });
        res.json({ ok: true, voice: result });
    } catch (err) {
        console.error('[Voice Route] Clone error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
