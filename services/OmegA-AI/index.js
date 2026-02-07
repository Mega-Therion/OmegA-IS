require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const ngrok = require('@ngrok/ngrok');
const wsManager = require('./src/services/websocket');
const realtimeRoute = require('./src/routes/realtime');
const grokVoiceRoute = require('./src/routes/grok-voice');
const app = require('./src/app');
const brain = require('./src/core/brain');

const PORT = process.env.PORT || 8080;
const ENABLE_NGROK = process.env.ENABLE_NGROK === '1';
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;

// Create HTTP server + WebSocket upgrade
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, "http://" + request.headers.host);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      const agentName = url.searchParams.get('agent') || 'unknown';
      wsManager.registerClient(agentName, ws);

      ws.on('message', (msg) => {
        try {
          const parsed = JSON.parse(msg);
          console.log("[WebSocket] Message from " + agentName + ": ", parsed.intent);
        } catch (e) {
          console.error('Invalid WebSocket message:', e);
        }
      });

      ws.on('close', () => {
        wsManager.deregisterClient(agentName, ws);
      });

      ws.on('error', (err) => {
        console.error("[WebSocket] Error for " + agentName + ": ", err);
      });
    });
  } else if (url.pathname === '/realtime') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      realtimeRoute.handleRealtimeConnection(ws);
    });
  } else if (url.pathname === '/grok-voice') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      const voice = url.searchParams.get('voice') || 'Rex';
      grokVoiceRoute.handleGrokVoiceConnection(ws, { voice });
    });
  }
});

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Close WebSocket connections
    wss.clients.forEach(client => {
        client.close(1001, 'Server shutting down');
    });

    // Close HTTP server
    server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcing exit');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, async () => {
  console.log("Express server listening on port " + PORT);
  console.log("WebSocket endpoint: ws://localhost:" + PORT + "/ws?agent=<agent_name>");

  // WAKE THE BRAIN
  brain.awaken();

  if (ENABLE_NGROK && NGROK_AUTHTOKEN) {
    try {
      const listener = await ngrok.connect({
        addr: PORT,
        authtoken_from_env: true,
      });
      console.log("Ingress established at: " + listener.url());
    } catch (err) {
      console.error('Error starting ngrok:', err);
    }
  } else if (ENABLE_NGROK) {
    console.warn('ENABLE_NGROK=1 but NGROK_AUTHTOKEN is not set; skipping ngrok.');
  }
});
