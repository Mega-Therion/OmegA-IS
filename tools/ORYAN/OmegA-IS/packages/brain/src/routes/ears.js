const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { transcribe } = require('../services/ears');
const brain = require('../core/brain');

const upload = multer({ dest: 'uploads/' });

router.post('/listen', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const transcript = await transcribe(req.file.path);
        
        // Cleanup temp file
        fs.unlinkSync(req.file.path);

        if (transcript) {
            // Feed to Brain directly!
            brain.handleThought(transcript);
            res.json({ success: true, transcript });
        } else {
            res.status(500).json({ error: 'Transcription yielded empty result' });
        }

    } catch (err) {
        console.error('[Ears Route] Error:', err);
        // Cleanup on error
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
