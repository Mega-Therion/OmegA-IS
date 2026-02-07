#!/usr/bin/env node

/**
 * Supabase MCP Server
 * Provides Model Context Protocol interface for Supabase operations
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const server = new Server(
  {
    name: 'gaing-supabase-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_files',
        description: 'Search and query files stored in Supabase. Can search by path, category, agent, or content.',
        inputSchema: {
          type: 'object',
          properties: {
            search_query: {
              type: 'string',
              description: 'Full-text search query',
            },
            category: {
              type: 'string',
              description: 'Filter by category (e.g., protocol, agent-config, documentation)',
            },
            agent_name: {
              type: 'string',
              description: 'Filter by agent (e.g., claude, gemini, grok)',
            },
            path_pattern: {
              type: 'string',
              description: 'Filter by path pattern',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return',
              default: 10,
            },
          },
        },
      },
      {
        name: 'get_file_content',
        description: 'Get the full content of a specific file by path',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'list_agent_files',
        description: 'List all files associated with a specific agent',
        inputSchema: {
          type: 'object',
          properties: {
            agent: {
              type: 'string',
              description: 'Agent name (claude, gemini, grok, codex)',
            },
          },
          required: ['agent'],
        },
      },
      {
        name: 'query_messages',
        description: 'Query messages from the gAIng coordination log',
        inputSchema: {
          type: 'object',
          properties: {
            agent: {
              type: 'string',
              description: 'Filter by agent name',
            },
            limit: {
              type: 'number',
              description: 'Number of messages to return',
              default: 20,
            },
            search: {
              type: 'string',
              description: 'Search message content',
            },
          },
        },
      },
      {
        name: 'add_message',
        description: 'Add a new message to the coordination log',
        inputSchema: {
          type: 'object',
          properties: {
            agent: {
              type: 'string',
              description: 'Agent name sending the message',
            },
            content: {
              type: 'string',
              description: 'Message content',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata',
            },
          },
          required: ['agent', 'content'],
        },
      },
      {
        name: 'list_storage_files',
        description: 'List files in Supabase Storage bucket',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path within bucket',
              default: '',
            },
            limit: {
              type: 'number',
              description: 'Max files to list',
              default: 100,
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'query_files': {
        let query = supabase.from('files').select('*');

        if (args.search_query) {
          query = query.textSearch('content', args.search_query);
        }
        if (args.category) {
          query = query.eq('category', args.category);
        }
        if (args.agent_name) {
          query = query.eq('agent_name', args.agent_name);
        }
        if (args.path_pattern) {
          query = query.ilike('path', `%${args.path_pattern}%`);
        }

        query = query.limit(args.limit || 10).order('updated_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'get_file_content': {
        const { data, error } = await supabase
          .from('files')
          .select('*')
          .eq('path', args.path)
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: data.content || 'No content available',
            },
          ],
        };
      }

      case 'list_agent_files': {
        const { data, error } = await supabase
          .from('files')
          .select('path, name, category, updated_at')
          .or(`agent_name.eq.${args.agent},is_shared.eq.true`)
          .order('category', { ascending: true });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'query_messages': {
        let query = supabase.from('messages').select('*');

        if (args.agent) {
          query = query.eq('agent', args.agent);
        }
        if (args.search) {
          query = query.ilike('content', `%${args.search}%`);
        }

        query = query.limit(args.limit || 20).order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'add_message': {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            agent: args.agent,
            content: args.content,
            metadata: args.metadata || {},
          })
          .select()
          .single();

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: `Message added: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      }

      case 'list_storage_files': {
        const { data, error } = await supabase.storage
          .from('gaing-files')
          .list(args.path || '', {
            limit: args.limit || 100,
            sortBy: { column: 'updated_at', order: 'desc' },
          });

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'supabase://files/all',
        name: 'All Files',
        description: 'All files stored in Supabase',
        mimeType: 'application/json',
      },
      {
        uri: 'supabase://messages/recent',
        name: 'Recent Messages',
        description: 'Recent coordination messages',
        mimeType: 'application/json',
      },
      {
        uri: 'supabase://storage/gaing-files',
        name: 'Storage Files',
        description: 'Files in Supabase Storage bucket',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    if (uri === 'supabase://files/all') {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (uri === 'supabase://messages/recent') {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  } catch (error) {
    throw new Error(`Failed to read resource: ${error.message}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('gAIng Supabase MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
