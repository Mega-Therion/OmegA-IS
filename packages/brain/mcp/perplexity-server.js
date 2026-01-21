#!/usr/bin/env node

/**
 * Perplexity MCP Server
 * Provides real-time research and search tools via Perplexity AI API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

dotenv.config();

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  console.error('Error: PERPLEXITY_API_KEY must be set in environment');
  process.exit(1);
}

const server = new Server(
  {
    name: 'omega-perplexity-server',
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
        name: 'perplexity_research',
        description: 'Search the web using Perplexity AI for real-time information, research, and factual updates.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The research query or search term',
            },
            model: {
              type: 'string',
              description: 'Perplexity model to use (default: sonar)',
              enum: ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro'],
              default: 'sonar'
            }
          },
          required: ['query'],
        },
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'perplexity_research') {
    const { query, model = 'sonar' } = request.params.arguments;

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'Be a helpful research assistant for the OMEGA system. Provide accurate, up-to-date information with citations where possible.' },
            { role: 'user', content: query }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          content: [{ type: 'text', text: `Perplexity API Error (${response.status}): ${errorData}` }],
          isError: true,
        };
      }

      const data = await response.json();
      const result = data.choices[0]?.message?.content || 'No result returned from Perplexity.';

      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error connecting to Perplexity: ${error.message}` }],
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
  console.error('OMEGA Perplexity MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in Perplexity MCP Server:', error);
  process.exit(1);
});
