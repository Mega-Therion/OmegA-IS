const fs = require('fs');
const path = require('path');
const config = require('../config/env');

async function transcribe(filePath) {
    console.log(`[Ears] Transcribing: ${filePath}`);

    // Check for OpenAI Key
    if (!config.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required for Whisper transcription.');
    }

    try {
        // We use native fetch with FormData for the OpenAI API
        // Node 18+ has native FormData
        const formData = new FormData();
        const fileContent = fs.readFileSync(filePath);
        const blob = new Blob([fileContent], { type: 'audio/webm' }); // Adjust type if needed
        
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENAI_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenAI Whisper Error: ${err}`);
        }

        const data = await response.json();
        return data.text;

    } catch (err) {
        console.error('[Ears] Transcription failed:', err);
        throw err;
    }
}

module.exports = { transcribe };
