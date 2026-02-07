/**
 * 🎙️ ΩmegA Backlog Producer
 * 
 * Takes entire chronological chat history and log data,
 * partitions it into 5-minute episode chunks, and generates
 * high-quality podcast scripts.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const MODEL = 'qwen2.5-coder:1.5b'; // Switched to available local model

const RAW_DIR = path.join(__dirname, '../raw');
const HISTORY_FILE = path.join(__dirname, '../../../../../.omega_chat_history.txt');
const LOG_FILE = path.join(__dirname, '../../log.md');
const OUTPUT_DIR = path.join(__dirname, '../episodes/backlog');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function generateBacklogEpisodes() {
    console.log('🎙️ Starting ΩmegA Backlog Production...');
    
    // 1. Load and Clean Data
    let fullContext = '';
    
    // Prioritize Genesis raw files
    if (fs.existsSync(RAW_DIR)) {
        const rawFiles = fs.readdirSync(RAW_DIR).sort();
        for (const file of rawFiles) {
            console.log(`📑 Including raw data from ${file}`);
            fullContext += fs.readFileSync(path.join(RAW_DIR, file), 'utf-8') + '\n\n';
        }
    }

    const history = fs.existsSync(HISTORY_FILE) ? fs.readFileSync(HISTORY_FILE, 'utf-8') : '';
    const logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf-8') : '';
    
    fullContext += '--- TERMINAL HISTORY ---\n\n' + history + '\n\n--- SYSTEM LOGS ---\n\n' + logs;
    const lines = fullContext.split('\n').filter(l => l.trim().length > 0);
    
    // 2. Partition into "Episodes" (approx 100 history lines per ep for 5 mins of banter)
    const CHUNK_SIZE = 100;
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        chunks.push(lines.slice(i, i + CHUNK_SIZE).join('\n'));
    }

    console.log(`📦 Partitioned history into ${3} episode chunks.`);

    for (let i = 0; i < 3; i++) {
        const episodeNum = i + 1;
        const episodeTitle = `The Early Days - Part ${episodeNum}`;
        console.log(`🎬 Producing Episode ${episodeNum}: ${episodeTitle}...`);

        const script = await generateScriptFromChunk(chunks[i], episodeNum);
        
        if (script) {
            const fileName = `episode_${episodeNum.toString().padStart(3, '0')}.json`;
            fs.writeFileSync(path.join(OUTPUT_DIR, fileName), JSON.stringify(script, null, 2));
            console.log(`✅ Episode ${episodeNum} saved.`);
        }
    }
}

async function generateScriptFromChunk(chunk, num) {
    const prompt = `
You are the Scriptwriter for "The Block Recap" podcast. 
STYLE: Comedy, sarcastic, technical. "Reno 911 meets tech standup".

CHARACTERS:
- Creator: Proud but exasperated boss.
- Gemini: The analytical, dry British strategist.
- Grok: The brutal roaster.

INPUT DATA (Verbatim chat history):
${chunk}

TASK:
Write a LONG podcast script (at least 20 lines of dialogue) reviewing the exact moments in the INPUT DATA.
1. Mention the specific dates if available.
2. Quote the most interesting or funny lines from the data.
3. Have Creator explain what he was trying to achieve.
4. Have Gemini analyze the technical/philosophical aspects.
5. Have Grok roast both of them based on the failures or weird questions in the data.

OUTPUT FORMAT: STRICT JSON only.
{
  "episode": ${num},
  "title": "A witty title",
  "segments": [
    { "speaker": "creator", "line": "..." },
    { "speaker": "gemini", "line": "..." },
    { "speaker": "grok", "line": "..." }
  ]
}
`;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: MODEL,
            prompt: prompt,
            stream: false,
            format: 'json'
        });

        return JSON.parse(response.data.response);
    } catch (e) {
        console.error(`❌ Failed to generate episode ${num}:`, e.message);
        return null;
    }
}

generateBacklogEpisodes();
