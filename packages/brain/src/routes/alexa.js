const express = require('express');
const router = express.Router();
const { callLlm } = require('../services/llm');
const { normalizeChatRequest } = require('../utils/helpers');

/**
 * Native Alexa Webhook Route
 * Bypasses missing n8n dependencies.
 */
router.post('/webhook', async (req, res) => {
    const body = req.body;
    const query = (body.query || body.text || body.utterance || "").toString().trim();

    if (!query) {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: { type: "PlainText", text: "I didn't catch that. Please try again." },
                shouldEndSession: false
            }
        });
    }

    try {
        // Force a friendly assistant persona for Alexa
        const normalized = {
            messages: [
                { role: 'system', content: 'You are OmegAI, a helpful sovereign assistant. Keep your response concise and speech-friendly (avoid markdown).' },
                { role: 'user', content: query }
            ],
            max_tokens: 200,
            temperature: 0.7
        };

        const data = await callLlm(normalized);
        let answer = data?.choices?.[0]?.message?.content || "I received a response, but it was empty.";

        // Clean markdown for speech
        answer = answer.replace(/[#*`_]/g, '').replace(/\[.*?\]\(.*?\)/g, '');

        return res.json({
            version: "1.0",
            response: {
                outputSpeech: { type: "PlainText", text: answer },
                shouldEndSession: true
            }
        });
    } catch (err) {
        console.error('[Alexa Bridge] Error:', err);
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: { type: "PlainText", text: "I had trouble reaching the OmegA brain. Please ensure your local services are online." },
                shouldEndSession: true
            }
        });
    }
});

module.exports = router;
