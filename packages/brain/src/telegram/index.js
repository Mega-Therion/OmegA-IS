'use strict';

const express = require('express');
const { createConfig } = require('./config');
const { TelegramClient } = require('./telegram-client');
const { MemoryStore } = require('./memory');
const { createTelegramRouter } = require('./router');

function createTelegramApp(options = {}) {
  const config = options.config || createConfig();
  const telegramClient = options.telegramClient || new TelegramClient(config);
  const memoryStore = options.memoryStore || new MemoryStore(config);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use('/telegram', createTelegramRouter({ config, telegramClient, memoryStore }));

  return {
    app,
    config,
    telegramClient,
    memoryStore
  };
}

if (require.main === module) {
  const { app, config } = createTelegramApp();
  app.listen(config.port, () => {
    console.log(`[telegram-router] listening on :${config.port}`);
    console.log('[telegram-router] routes: GET /telegram/healthz, POST /telegram/webhook/:agent');
  });
}

module.exports = {
  createTelegramApp
};
