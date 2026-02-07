const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.clients = new Map(); // agent_name -> Set of WebSocket connections
    this.subscriptions = new Map(); // agent_name -> Set of subscribed agents
  }

  // Register a client connection
  registerClient(agentName, ws) {
    if (!this.clients.has(agentName)) {
      this.clients.set(agentName, new Set());
    }
    this.clients.get(agentName).add(ws);
    console.log(`[WebSocket] ${agentName} connected. Total connections: ${this.clients.get(agentName).size}`);
  }

  // Deregister a client connection
  deregisterClient(agentName, ws) {
    if (this.clients.has(agentName)) {
      this.clients.get(agentName).delete(ws);
      if (this.clients.get(agentName).size === 0) {
        this.clients.delete(agentName);
      }
    }
    console.log(`[WebSocket] ${agentName} disconnected.`);
  }

  // Broadcast message to specific agent(s) or all connected agents
  broadcast(message, targetAgent = null) {
    const payload = JSON.stringify(message);

    if (targetAgent === 'broadcast') {
      // Send to all connected agents
      for (const [, conns] of this.clients.entries()) {
        for (const ws of conns) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        }
      }
    } else if (targetAgent) {
      // Send to specific agent
      const conns = this.clients.get(targetAgent);
      if (conns) {
        for (const ws of conns) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          }
        }
      }
    }
  }

  // Get connection status
  getStatus() {
    const status = {};
    for (const [agentName, conns] of this.clients.entries()) {
      status[agentName] = conns.size;
    }
    return status;
  }
}

module.exports = new WebSocketManager();
