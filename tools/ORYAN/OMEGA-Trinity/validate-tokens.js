const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bots = [
    { name: 'Safa', key: 'TELEGRAM_BOT_TOKEN' },
    { name: 'Gemini', key: 'GEMINI_BOT_TOKEN' },
    { name: 'Claude', key: 'CLAUDE_BOT_TOKEN' },
    { name: 'Codex', key: 'CODEX_BOT_TOKEN' },
    { name: 'Grok', key: 'GROK_BOT_TOKEN' },
    { name: 'Perplexity', key: 'PERPLEXITY_BOT_TOKEN' }
];

async function checkToken(bot) {
    const token = process.env[bot.key];
    if (!token) return { name: bot.name, status: 'MISSING ❌' };

    return new Promise((resolve) => {
        https.get(`https://api.telegram.org/bot${token}/getMe`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const result = JSON.parse(data);
                if (result.ok) {
                    resolve({ name: bot.name, status: `VALID ✅ (@${result.result.username})` });
                } else {
                    resolve({ name: bot.name, status: `INVALID ❌ (${result.description})` });
                }
            });
        }).on('error', (e) => {
            resolve({ name: bot.name, status: `ERROR ⚠️ (${e.message})` });
        });
    });
}

(async () => {
    console.log('\n🔍 Validating Telegram Bot Tokens...\n');
    for (const bot of bots) {
        const result = await checkToken(bot);
        console.log(`${result.name.padEnd(12)}: ${result.status}`);
    }
    console.log('\nDone.');
})();
