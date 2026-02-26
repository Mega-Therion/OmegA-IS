// OmegA Telegram Bot - Minimal Clean Version
// No auth filters, full verbose logging, direct Brain connection

const https = require('https');

const BOT_TOKEN = '8512088298:AAFMZ7r45L43G406qeBc1C0Ua6WHsgcyR1o';
const BRAIN_URL = 'http://localhost:8080';
const BRAIN_TOKEN = 'oL9qXXf-yqaizBhelLBTpbiY0t6BJKlOPsrrOXBsDiQ';
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

let offset = 0;

function telegramRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function brainChat(userMessage) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      messages: [{ role: 'user', content: userMessage }]
    });
    const http = require('http');
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/omega/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BRAIN_TOKEN}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed?.response?.content || parsed?.message || JSON.stringify(parsed));
        } catch (e) { resolve(data || 'No response from Brain'); }
      });
    });
    req.on('error', (e) => resolve(`Brain offline: ${e.message}`));
    req.write(body);
    req.end();
  });
}

async function sendMessage(chatId, text) {
  console.log(`[OUT] → ${chatId}: ${text.substring(0, 80)}...`);
  return telegramRequest('sendMessage', { chat_id: chatId, text });
}

async function poll() {
  try {
    const res = await telegramRequest('getUpdates', {
      offset,
      timeout: 30,
      allowed_updates: ['message']
    });

    if (!res.ok) {
      console.error('[ERROR] Telegram API:', JSON.stringify(res));
      setTimeout(poll, 5000);
      return;
    }

    for (const update of res.result || []) {
      offset = update.update_id + 1;
      const msg = update.message;
      if (!msg || !msg.text) continue;

      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || msg.from.first_name || 'unknown';
      const text = msg.text;

      console.log(`[IN] from ${username} (${userId}) in chat ${chatId}: ${text}`);

      // Send to Brain
      const reply = await brainChat(text);
      console.log(`[BRAIN] replied: ${reply.substring(0, 100)}`);
      await sendMessage(chatId, reply);
    }
  } catch (e) {
    console.error('[POLL ERROR]', e.message);
  }
  setTimeout(poll, 1000);
}

async function main() {
  const me = await telegramRequest('getMe', {});
  if (!me.ok) {
    console.error('TOKEN INVALID:', JSON.stringify(me));
    process.exit(1);
  }
  console.log(`[START] OmegA bot live as @${me.result.username}`);
  console.log(`[INFO] Send any message to @${me.result.username} in Telegram now`);
  poll();
}

main();
