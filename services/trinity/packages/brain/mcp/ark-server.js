#!/usr/bin/env node

/**
 * OmegA ARK Bus MCP Server
 * Acts as a bridge between the system and physical/simulated devices on the ARK Bus.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

// Default OMEGA Server URL (Omega Rust Core)
const OMEGA_SERVER_URL = process.env.OMEGA_SERVER_URL || 'http://localhost:8081';

const server = new Server(
  {
    name: 'omega-ark-bus',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'ark_list_devices',
        description: 'List all physical and simulated devices on the ARK Bus.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'ark_discover',
        description: 'Initiate a discovery pulse to find new devices on the ARK Bus.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'ark_device_command',
        description: 'Send a command to a specific ARK device.',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'The ID of the device (e.g., ARK-ROBOT-01)' },
            command: { type: 'string', description: 'The command string (e.g., REBOOT, ARM_MOVE:10,20,30, POWER_ON)' }
          },
          required: ['device_id', 'command'],
        },
      },
      {
        name: 'ark_get_telemetry',
        description: 'Get detailed information and telemetry for a specific ARK device.',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'The ID of the device' }
          },
          required: ['device_id'],
        },
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'ark_list_devices': {
        const response = await fetch(`${OMEGA_SERVER_URL}/api/devices`);
        const devices = await response.json();
        return { content: [{ type: 'text', text: JSON.stringify(devices, null, 2) }] };
      }

      case 'ark_discover': {
        const response = await fetch(`${OMEGA_SERVER_URL}/api/devices/discover`, { method: 'POST' });
        const discovered = await response.json();
        return { content: [{ type: 'text', text: `Discovery complete. Discovered: ${JSON.stringify(discovered, null, 2)}` }] };
      }

      case 'ark_device_command': {
        const response = await fetch(`${OMEGA_SERVER_URL}/api/devices/${args.device_id}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: args.command })
        });
        const result = await response.json();
        return { content: [{ type: 'text', text: result }] };
      }

      case 'ark_get_telemetry': {
        const response = await fetch(`${OMEGA_SERVER_URL}/api/devices/${args.device_id}`);
        if (!response.ok) throw new Error(`Device ${args.device_id} not found`);
        const device = await response.json();
        return { content: [{ type: 'text', text: JSON.stringify(device, null, 2) }] };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `ARK Bus Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OMEGA ARK Bus MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in ARK Bus MCP Server:', error);
  process.exit(1);
});
