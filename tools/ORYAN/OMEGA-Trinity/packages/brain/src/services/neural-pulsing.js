const Redis = require('ioredis');

class NeuralPulsing {
    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/0';
        this.publisher = new Redis(redisUrl);
        this.subscriber = new Redis(redisUrl);
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
    }

    /**
     * Broadcast a thought to the collective
     */
    pulse(agent, intent, data = {}) {
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
