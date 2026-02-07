const EventEmitter = require('events');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');
const { createVisionSession } = require('./realtime-vision');

class GeminiRealtimeSession extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.model = null;
    this.bufferedText = '';
    this.bufferedImages = [];
  }

  async connect() {
    if (!config.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    const client = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const modelName = this.options.model || 'gemini-2.0-flash-exp';
    this.model = client.getGenerativeModel({ model: modelName });
    this.emit('session_started');
  }

  addImage(data, mimeType = 'image/png') {
    this.bufferedImages.push({
      inlineData: { data, mimeType },
    });
  }

  async sendMessage(message) {
    if (!this.model) {
      throw new Error('Gemini session not connected');
    }
    const parts = [];
    if (message?.text) {
      parts.push({ text: message.text });
    }
    parts.push(...this.bufferedImages);
    this.bufferedImages = [];

    const stream = await this.model.generateContentStream({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: message?.temperature ?? 0.3,
      },
    });

    this.bufferedText = '';

    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        this.bufferedText += text;
        this.emit('response_delta', { text });
      }
    }

    this.emit('response_completed', {
      response: { text: this.bufferedText },
    });
  }

  sendAudio() {
    this.emit('error', new Error('Gemini realtime audio not supported'));
  }

  interrupt() {
    this.emit('interrupted');
  }

  close() {
    this.emit('close');
  }
}

function createRealtimeSession({ provider, model } = {}) {
  const selected = (provider || 'openai').toLowerCase();
  if (selected === 'gemini') {
    return new GeminiRealtimeSession({ model });
  }
  return createVisionSession({ model });
}

module.exports = {
  GeminiRealtimeSession,
  createRealtimeSession,
};
