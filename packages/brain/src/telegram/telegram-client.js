'use strict';

const { normalizeAgent } = require('./config');

class TelegramClient {
  constructor(config, fetchImpl = global.fetch) {
    this.config = config;
    this.fetch = fetchImpl;
    this.profileCache = new Map();

    if (typeof this.fetch !== 'function') {
      throw new Error('Global fetch is required (Node 18+).');
    }
  }

  async sendMessage(agent, chatId, text, extra = {}) {
    return this.request(agent, 'sendMessage', {
      chat_id: chatId,
      text,
      ...extra
    });
  }

  async getMe(agent) {
    const normalizedAgent = normalizeAgent(agent);
    if (this.profileCache.has(normalizedAgent)) {
      return this.profileCache.get(normalizedAgent);
    }

    const response = await this.request(normalizedAgent, 'getMe', {});
    this.profileCache.set(normalizedAgent, response);
    return response;
  }

  async request(agent, method, payload) {
    const normalizedAgent = normalizeAgent(agent);
    const token = this.config.getAgentToken(normalizedAgent);
    if (!token) {
      throw new Error(`Missing Telegram token for agent "${normalizedAgent}".`);
    }

    const url = `https://api.telegram.org/bot${token}/${method}`;
    const res = await this.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });

    let data;
    try {
      data = await res.json();
    } catch (err) {
      throw new Error(`Telegram API ${method} returned non-JSON response.`);
    }

    if (!res.ok || !data.ok) {
      const detail = data && data.description ? data.description : `status ${res.status}`;
      throw new Error(`Telegram API ${method} failed: ${detail}`);
    }

    return data.result;
  }
}

module.exports = {
  TelegramClient
};
