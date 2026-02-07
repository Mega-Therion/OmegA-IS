const Redis = require('ioredis');

class NeuralPulsing {
    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            console.warn('[NeuralPulsing] REDIS_URL not set; pulsing disabled.');
            this.enabled = false;
            return;
        }

        try {
            this.publisher = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
            this.subscriber = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
            this.enabled = true;

            this.publisher.on('error', (err) => {
                console.error('[NeuralPulsing] Publisher error:', err.message);
                this.enabled = false;
            });

            this.subscriber.on('error', (err) => {
                console.error('[NeuralPulsing] Subscriber error:', err.message);
                this.enabled = false;
            });

            this.channels = new Set();
            this.callbacks = new Map();

            this.subscriber.on('message', (channel, message) => {
                if (this.callbacks.has(channel)) {
                    try {
                        const parsed = JSON.parse(message);
                        this.callbacks.get(channel).forEach(cb => cb(parsed));
                    } catch (e) {
                        console.error(`[NeuralPulsing] Failed to parse message on ${channel}:`, e.message);
                    }
                }
            });
        } catch (err) {
            console.warn('[NeuralPulsing] Failed to init Redis:', err.message);
            this.enabled = false;
        }
    }

    /**
     * Broadcast a thought to the collective
     */
    pulse(agent, intent, data = {}) {
        if (!this.enabled) return;
        const payload = {
            agent,
            intent,
            data,
            timestamp: Date.now()
        };
        const channel = 'omega:collective';
        this.publisher.publish(channel, JSON.stringify(payload));
        console.log(`[NeuralPulsing] 📡 ${agent} pulsed: ${intent}`);
    }

    /**
     * Listen for thoughts from the collective
     */
    onPulse(callback) {
        if (!this.enabled) return;
        const channel = 'omega:collective';
        if (!this.channels.has(channel)) {
            this.subscriber.subscribe(channel);
            this.channels.add(channel);
        }

        if (!this.callbacks.has(channel)) {
            this.callbacks.set(channel, []);
        }
        this.callbacks.get(channel).push(callback);
    }
}

// Singleton instance
let instance = null;

function getNeuralPulsing() {
    if (!instance) {
        instance = new NeuralPulsing();
    }
    return instance;
}

module.exports = { getNeuralPulsing };
