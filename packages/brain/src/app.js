const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

const membersRoutes = require('./routes/members');
const memoriesRoutes = require('./routes/memories');
const mem0Routes = require('./routes/mem0');
const llmRoutes = require('./routes/llm');
const llmV2Routes = require('./routes/llm-v2');
const omegaRoutes = require('./routes/omega');
const messagesRoutes = require('./routes/messages');
const tasksRoutes = require('./routes/tasks');
const systemRoutes = require('./routes/system');
const safaRoutes = require('./routes/safa');
const agentsRoutes = require('./routes/agents');
const realtimeRoutes = require('./routes/realtime').router;
const grokVoiceRoutes = require('./routes/grok-voice').router;
const missionRoutes = require('./routes/mission');
const missionsRoutes = require('./routes/missions');
const voiceRoutes = require('./routes/voice');
const eyesRoutes = require('./routes/eyes');
const earsRoutes = require('./routes/ears');
const analyticsRoutes = require('./routes/analytics');
const bridgeRoutes = require('./routes/bridge');
const terminalRoutes = require('./routes/terminal');
const mcpRoutes = require('./routes/mcp');
const agenticCodingRoutes = require('./routes/agentic-coding');
const mediaRoutes = require('./routes/media');
const documentsRoutes = require('./routes/documents');
const rlhfRoutes = require('./routes/rlhf');
const codeInterpreterRoutes = require('./routes/code-interpreter');
const orchestratorUtilsRoutes = require('./routes/orchestrator-utils');

// New advanced routes
let podcastRoutes, observability, streaming, vaultQueueRoutes;
try { podcastRoutes = require('./routes/podcast'); } catch (e) { podcastRoutes = null; }
try { observability = require('./services/observability'); } catch (e) { observability = null; }
try { streaming = require('./services/streaming'); } catch (e) { streaming = null; }
try { vaultQueueRoutes = require('./routes/vault-queue'); } catch (e) { vaultQueueRoutes = null; }

// Consciousness Kernel
const { ConsciousnessKernel } = require('./services/consciousnessKernel');
const { createKernelRouter } = require('./routes/kernel');

// Initialize and start Consciousness Kernel
const kernel = new ConsciousnessKernel();
kernel.start();

// Log kernel events for debugging
kernel.on('mode_changed', (evt) => {
  console.log(`[Kernel] Mode changed: ${evt.payload.mode}`);
});
kernel.on('reflection', (evt) => {
  console.log(`[Kernel] Reflection: ${evt.payload.recommendation}`);
});

// CORS - allow configured origins or all in dev
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.RATE_LIMIT || 100,
  message: { ok: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Observability middleware
if (observability) {
  app.use(observability.metricsMiddleware(observability.registry));
  app.use(observability.tracingMiddleware(observability.tracer));
}

app.use(express.json());
app.use('/ui', express.static('public'));

app.use('/', systemRoutes);
app.use('/', mem0Routes);
app.use('/members', membersRoutes);
app.use('/memories', memoriesRoutes);
app.use('/messages', messagesRoutes);
app.use('/tasks', tasksRoutes);
app.use('/llm', llmRoutes);
app.use('/v2/llm', llmV2Routes);
app.use('/omega', omegaRoutes);
app.use('/safa', safaRoutes);
app.use('/agents', agentsRoutes);
app.use('/realtime', realtimeRoutes);
app.use('/grok-voice', grokVoiceRoutes);
app.use('/mission', missionRoutes);
app.use('/missions', missionsRoutes);
app.use('/voice', voiceRoutes);
app.use('/eyes', eyesRoutes);
app.use('/ears', earsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/bridge', bridgeRoutes);
app.use('/terminal', terminalRoutes);
app.use('/mcp', mcpRoutes);
app.use('/code', agenticCodingRoutes);
app.use('/media', mediaRoutes);
app.use('/documents', documentsRoutes);
app.use('/rlhf', rlhfRoutes);
app.use('/code-interpreter', codeInterpreterRoutes);
app.use('/api', orchestratorUtilsRoutes);
app.use('/api/kernel', createKernelRouter(kernel));
app.use('/captures', express.static('public/captures'));

// Podcast routes
if (podcastRoutes) {
  app.use('/podcast', podcastRoutes);
  console.log('[App] Podcast API enabled at /podcast');
}

// SSE Streaming endpoint
if (streaming) {
  app.post('/api/chat/stream', streaming.streamingChatHandler);
  console.log('[App] Streaming chat enabled at /api/chat/stream');
}

// Vault & Queue routes
if (vaultQueueRoutes) {
  app.use('/api', vaultQueueRoutes);
  console.log('[App] Vault & Queue API enabled at /api/vault, /api/queue');
}

module.exports = app;
