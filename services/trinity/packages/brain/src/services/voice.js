const config = require('../config/env');

async function speakWithElevenLabs(text, options = {}) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
    const modelId = options.modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_monolingual_v1';

    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY is not set');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
        },
        body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
                stability: options.stability ?? 0.5,
                similarity_boost: options.similarityBoost ?? 0.5
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`ElevenLabs error: ${err}`);
    }

    return response.arrayBuffer();
}

async function speakWithOpenAI(text, options = {}) {
    if (!config.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
    }

    const model = options.model || process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
    const voice = options.voice || process.env.OPENAI_TTS_VOICE || 'alloy';

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model,
            voice,
            input: text,
            format: 'mp3'
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI TTS error: ${err}`);
    }

    return response.arrayBuffer();
}

async function speak(text, options = {}) {
    const preferred = (options.provider || process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase();
    const attempts = preferred === 'openai' ? ['openai', 'elevenlabs'] : ['elevenlabs', 'openai'];
    let lastError = null;

    for (const provider of attempts) {
        try {
            if (provider === 'elevenlabs') {
                return await speakWithElevenLabs(text, options);
            }
            if (provider === 'openai') {
                return await speakWithOpenAI(text, options);
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw lastError || new Error('No TTS provider available');
}

async function cloneVoice({ name, description, files }) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY is not set');
    }
    if (!files || files.length === 0) {
        throw new Error('Audio samples required');
    }

    const form = new FormData();
    form.append('name', name || `voice-${Date.now()}`);
    if (description) form.append('description', description);
    files.forEach((file) => {
        const blob = new Blob([file.buffer], { type: file.mimetype || 'audio/mpeg' });
        form.append('files', blob, file.originalname || 'sample.mp3');
    });

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey
        },
        body: form
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`ElevenLabs clone error: ${err}`);
    }

    return response.json();
}

module.exports = { speak, cloneVoice };
