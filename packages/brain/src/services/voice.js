const config = require('../config/env');

async function speak(text) {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel

    if (!ELEVENLABS_API_KEY) {
        throw new Error('ELEVENLABS_API_KEY is not set');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`ElevenLabs error: ${err}`);
    }

    return await response.arrayBuffer();
}

module.exports = { speak };
