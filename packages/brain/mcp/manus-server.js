#!/usr/bin/env node

/**
 * Manus MCP Server
 * Provides access to Manus AI capabilities via MCP
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

const MANUS_API_KEY = process.env.MANUS_API_KEY;

if (!MANUS_API_KEY) {
  console.error('Error: MANUS_API_KEY must be set in environment');
  process.exit(1);
}

const server = new Server(
  {
    name: 'omega-manus-server',
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
        name: 'manus_generate',
        description: 'Generate content or execute tasks using Manus AI. Use this for general-purpose AI tasks supported by Manus.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'The prompt or instruction for Manus AI',
            },
            model: {
              type: 'string',
              description: 'Optional model identifier (default: manus-1)',
              default: 'manus-1'
            }
          },
          required: ['prompt'],
        },
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'manus_generate') {
    const { prompt, model = 'manus-1' } = request.params.arguments;

    try {
      const response = await fetch('https://api.manus.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MANUS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          // Add other default parameters if known, e.g., max_tokens, temperature
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          content: [{ type: 'text', text: `Manus API Error (${response.status}): ${errorData}` }],
          isError: true,
        };
      }

      const data = await response.json();
      // Adjust response parsing based on actual API response structure. 
      // Assuming a standard 'result', 'output', or 'content' field.
      // If unknown, we dump the whole JSON to ensure we capture the data.
      const result = data.output || data.result || data.content || JSON.stringify(data, null, 2);

      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error connecting to Manus: ${error.message}` }],
        isError: true,
      };
    }
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OMEGA Manus MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in Manus MCP Server:', error);
  process.exit(1);
});
