const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const toolRegistry = require('./tool-registry');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', '..', 'mcp', 'servers.json');

function interpolateEnv(value) {
  if (typeof value === 'string') {
    return value.replace(/\$\{([A-Z0-9_]+)\}/gi, (_, key) => process.env[key] || '');
  }
  if (Array.isArray(value)) {
    return value.map(interpolateEnv);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, interpolateEnv(v)])
    );
  }
  return value;
}

class McpClientManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.configPath = options.configPath || DEFAULT_CONFIG_PATH;
    this.clients = new Map();
    this.toolMap = new Map();
  }

  async loadConfig() {
    const raw = await fs.readFile(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const servers = parsed.servers || [];
    return servers.map(interpolateEnv);
  }

  async connectAll() {
    const servers = await this.loadConfig();
    for (const server of servers) {
      await this.connectServer(server);
    }
    return this.getStatus();
  }

  async connectServer(server) {
    if (!server?.name) {
      throw new Error('MCP server config missing name');
    }

    if (this.clients.has(server.name)) {
      return this.clients.get(server.name);
    }

    if (server.transport !== 'stdio') {
      throw new Error(`Unsupported MCP transport: ${server.transport}`);
    }

    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args || [],
      env: server.env || {},
    });

    const client = new Client(
      { name: 'omega-brain', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    const tools = await client.listTools();
    const resources = await client.listResources().catch(() => ({ resources: [] }));

    this.clients.set(server.name, {
      config: server,
      client,
      tools: tools?.tools || [],
      resources: resources?.resources || [],
    });

    this.registerTools(server.name, tools?.tools || []);

    this.emit('connected', server.name);
    return this.clients.get(server.name);
  }

  registerTools(serverName, tools) {
    tools.forEach((tool) => {
      const alias = `mcp_${serverName}_${tool.name}`;
      this.toolMap.set(alias, { serverName, toolName: tool.name });
      toolRegistry.registerTool({
        name: alias,
        description: `[MCP:${serverName}] ${tool.description || 'MCP tool'}`,
        parameters: tool.inputSchema || {
          type: 'object',
          properties: {},
        },
        handler: async (args) => {
          const clientEntry = this.clients.get(serverName);
          if (!clientEntry) {
            throw new Error(`MCP server not connected: ${serverName}`);
          }
          const result = await clientEntry.client.callTool({
            name: tool.name,
            arguments: args || {},
          });
          return result;
        },
      });
    });
  }

  async listTools(serverName = null) {
    if (serverName) {
      const entry = this.clients.get(serverName);
      return entry ? entry.tools : [];
    }
    const all = [];
    for (const [name, entry] of this.clients.entries()) {
      all.push({ server: name, tools: entry.tools });
    }
    return all;
  }

  async listResources(serverName = null) {
    if (serverName) {
      const entry = this.clients.get(serverName);
      return entry ? entry.resources : [];
    }
    const all = [];
    for (const [name, entry] of this.clients.entries()) {
      all.push({ server: name, resources: entry.resources });
    }
    return all;
  }

  getStatus() {
    const status = [];
    for (const [name, entry] of this.clients.entries()) {
      status.push({
        name,
        transport: entry.config.transport,
        tools: entry.tools.length,
        resources: entry.resources.length,
      });
    }
    return status;
  }
}

const manager = new McpClientManager();

async function initMcp() {
  try {
    return await manager.connectAll();
  } catch (error) {
    console.warn('[MCP] Initialization skipped:', error.message);
    return [];
  }
}

module.exports = {
  McpClientManager,
  manager,
  initMcp,
};
