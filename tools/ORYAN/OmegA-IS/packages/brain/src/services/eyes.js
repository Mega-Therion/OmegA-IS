const screenshot = require('screenshot-desktop');
const path = require('path');
const fs = require('fs');
const { callLlm } = require('./llm');

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'captures');

// Ensure capture dir exists
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

async function captureScreen() {
    const filename = `capture_${Date.now()}.png`;
    const filepath = path.join(PUBLIC_DIR, filename);
    
    await screenshot({ filename: filepath });
    return { 
        filepath, 
        filename,
        url: `/captures/${filename}`
    };
}

async function analyzeScreen() {
    // 1. Capture
    const { filepath, url } = await captureScreen();
    
    // 2. Read as base64 for LLM
    const bitmap = fs.readFileSync(filepath);
    const base64Image = new Buffer.from(bitmap).toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    // 3. Ask LLM (Multimodal)
    // Note: This requires a model that supports vision (GPT-4o, Gemini 1.5 Pro)
    // For now, we construct the payload, assuming the configured LLM supports it.
    
    const prompt = "What is currently visible on this screen? Be concise.";

    try {
        // We need to bypass the standard callLlm text-only interface if using specific provider extensions
        // But for standard OpenAI/Grok compatible vision endpoints:
        const payload = {
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: dataUrl } }
                    ]
                }
            ],
            maxTokens: 300
        };

        const response = await callLlm(payload);
        const description = response.choices ? response.choices[0].message.content : response.response.content;
        
        return { 
            url, 
            description 
        };

    } catch (err) {
        console.error('[Eyes] Analysis failed:', err);
        return { 
            url, 
            description: "I captured the screen, but my vision processing failed (LLM Error). Check if your model supports Image inputs."
        };
    }
}

module.exports = { captureScreen, analyzeScreen };
