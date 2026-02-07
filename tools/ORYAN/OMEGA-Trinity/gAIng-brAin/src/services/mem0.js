const { webcrypto } = require('crypto');

// mem0ai's telemetry assumes a browser-like window; provide a minimal shim in Node.
if (typeof global.window === 'undefined') {
    global.window = {
        crypto: globalThis.crypto || webcrypto,
        navigator: { userAgent: 'node' }
    };
}

const { MemoryClient } = require('mem0ai');
const config = require('../config/env');

class DeepMemory {
    constructor() {
        if (config.MEM0_API_KEY) {
            this.client = new MemoryClient({
                apiKey: config.MEM0_API_KEY
            });
            this.userId = config.MEM0_USER_ID || 'user_default';
            console.log('[Mem0] Deep Memory initialized.');
        } else {
            console.warn('[Mem0] No API Key found. Deep Memory disabled.');
            this.client = null;
        }
    }

    async add(text, metadata = {}) {
        if (!this.client) return;
        try {
            await this.client.add(text, { user_id: this.userId, metadata });
            console.log('[Mem0] Memory Stored.');
        } catch (err) {
            console.error('[Mem0] Add Failed:', err);
        }
    }

    async search(query, limit = 3) {
        if (!this.client) return [];
        try {
            const results = await this.client.search(query, { user_id: this.userId, limit });
            return results.map(r => r.memory);
        } catch (err) {
            console.error('[Mem0] Search Failed:', err);
            return [];
        }
    }
}

module.exports = new DeepMemory();
