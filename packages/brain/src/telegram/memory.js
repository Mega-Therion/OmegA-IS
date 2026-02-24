'use strict';

const { normalizeAgent } = require('./config');

function makeKey(agent, chatId, userId) {
  return `${normalizeAgent(agent)}:${String(chatId)}:${String(userId)}`;
}

class MemoryStore {
  constructor(config, fetchImpl = global.fetch) {
    this.config = config;
    this.fetch = fetchImpl;
    this.localShort = new Map();
    this.localConversation = new Map();
    this.supabase = {
      url: config.supabase.url,
      key: config.supabase.key,
      table: config.supabase.table
    };
  }

  isSupabaseEnabled() {
    return Boolean(this.fetch && this.supabase.url && this.supabase.key);
  }

  // Backward-compatible short-memory methods.
  async get(agent, chatId, userId) {
    return this.getShort(agent, chatId, userId);
  }

  async set(agent, chatId, userId, value) {
    return this.setShort(agent, chatId, userId, value);
  }

  async getShort(agent, chatId, userId) {
    const key = makeKey(agent, chatId, userId);
    const fallback = this.localShort.get(key) || '';

    if (!this.isSupabaseEnabled()) {
      return fallback;
    }

    try {
      const remote = await this.getFromSupabase(agent, chatId, userId);
      if (typeof remote === 'string' && remote.length > 0) {
        this.localShort.set(key, remote);
        return remote;
      }
      return fallback;
    } catch (err) {
      return fallback;
    }
  }

  async setShort(agent, chatId, userId, value) {
    const key = makeKey(agent, chatId, userId);
    const memory = String(value || '').trim().slice(0, 1000);
    if (!memory) {
      await this.clear(agent, chatId, userId);
      return '';
    }

    this.localShort.set(key, memory);

    if (!this.isSupabaseEnabled()) {
      return memory;
    }

    try {
      await this.upsertToSupabase(agent, chatId, userId, memory);
    } catch (err) {
      // Keep local cache as fallback.
    }

    return memory;
  }

  async clear(agent, chatId, userId) {
    const key = makeKey(agent, chatId, userId);
    this.localShort.delete(key);
    this.localConversation.delete(key);

    if (!this.isSupabaseEnabled()) {
      return;
    }

    try {
      await this.deleteFromSupabase(agent, chatId, userId);
    } catch (err) {
      // Local fallback already cleared.
    }
  }

  async getConversation(agent, chatId, userId, limit = this.config.maxConversationMessages || 20) {
    const key = makeKey(agent, chatId, userId);
    const history = this.localConversation.get(key) || [];
    if (!Array.isArray(history)) {
      return [];
    }
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    if (history.length <= safeLimit) {
      return [...history];
    }
    return history.slice(-safeLimit);
  }

  async appendConversation(agent, chatId, userId, role, content, maxMessages = this.config.maxConversationMessages || 20) {
    const key = makeKey(agent, chatId, userId);
    const current = this.localConversation.get(key) || [];
    const next = [...current, { role: String(role || 'user'), content: String(content || '') }]
      .filter((msg) => msg.content.trim().length > 0);

    const safeMax = Number.isFinite(maxMessages) && maxMessages > 0 ? Math.min(maxMessages, 100) : 20;
    const trimmed = next.length > safeMax ? next.slice(-safeMax) : next;
    this.localConversation.set(key, trimmed);
    return trimmed;
  }

  async getFromSupabase(agent, chatId, userId) {
    const url = new URL(`/rest/v1/${this.supabase.table}`, this.supabase.url);
    url.searchParams.set('select', 'memory');
    url.searchParams.set('agent', `eq.${normalizeAgent(agent)}`);
    url.searchParams.set('chat_id', `eq.${String(chatId)}`);
    url.searchParams.set('user_id', `eq.${String(userId)}`);
    url.searchParams.set('limit', '1');

    const res = await this.fetch(url, {
      method: 'GET',
      headers: this.supabaseHeaders()
    });

    if (!res.ok) {
      throw new Error(`Supabase read failed with status ${res.status}`);
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return '';
    }

    return rows[0].memory || '';
  }

  async upsertToSupabase(agent, chatId, userId, memory) {
    const url = new URL(`/rest/v1/${this.supabase.table}`, this.supabase.url);
    const payload = [{
      agent: normalizeAgent(agent),
      chat_id: String(chatId),
      user_id: String(userId),
      memory,
      updated_at: new Date().toISOString()
    }];

    const res = await this.fetch(url, {
      method: 'POST',
      headers: {
        ...this.supabaseHeaders(),
        Prefer: 'resolution=merge-duplicates,return=minimal',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Supabase upsert failed with status ${res.status}`);
    }
  }

  async deleteFromSupabase(agent, chatId, userId) {
    const url = new URL(`/rest/v1/${this.supabase.table}`, this.supabase.url);
    url.searchParams.set('agent', `eq.${normalizeAgent(agent)}`);
    url.searchParams.set('chat_id', `eq.${String(chatId)}`);
    url.searchParams.set('user_id', `eq.${String(userId)}`);

    const res = await this.fetch(url, {
      method: 'DELETE',
      headers: this.supabaseHeaders()
    });

    if (!res.ok) {
      throw new Error(`Supabase delete failed with status ${res.status}`);
    }
  }

  supabaseHeaders() {
    return {
      apikey: this.supabase.key,
      Authorization: `Bearer ${this.supabase.key}`
    };
  }
}

module.exports = {
  MemoryStore
};
