# gAIng-Brain MCP Servers

Model Context Protocol (MCP) servers for the gAIng-Brain multi-agent system.

## What is MCP?

MCP (Model Context Protocol) is a standard protocol that lets AI agents interact with external data sources and tools. It provides a unified interface for AI models to query databases, search files, and perform actions.

## Available Servers

### 1. gaing-supabase (Custom)
Connects to your Supabase database and storage.

**Tools:**
- `query_files` - Search and query files stored in Supabase
- `get_file_content` - Get full content of a specific file
- `list_agent_files` - List files for a specific agent (claude, gemini, grok)
- `query_messages` - Query coordination messages
- `add_message` - Add new message to the log
- `list_storage_files` - List files in storage bucket

**Resources:**
- `supabase://files/all` - All files in database
- `supabase://messages/recent` - Recent coordination messages
- `supabase://storage/gaing-files` - Storage bucket contents

### 2. filesystem (Official)
Access to local filesystem.

### 3. github (Official)
GitHub repository integration.

## Configuration

MCP servers are configured in `mcp/servers.json`:

```json
{
  "servers": [
    {
      "name": "gaing-supabase",
      "transport": "stdio",
      "command": "node",
      "args": ["mcp/supabase-server.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  ]
}
```

Environment variables are loaded from your `.env` file.

## Usage

### For Claude Desktop

Add to your Claude Desktop configuration (`~/AppData/Roaming/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gaing-supabase": {
      "command": "node",
      "args": ["C:\\Users\\mega_\\gAIng-Brain\\gAIng-brAin\\mcp\\supabase-server.js"],
      "env": {
        "SUPABASE_URL": "https://sgvitxezqrjgjmduoool.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key-here"
      }
    }
  }
}
```

### For Claude Code CLI

Claude Code automatically loads MCP servers from `mcp/servers.json` in your project root.

### Programmatic Usage

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['mcp/supabase-server.js'],
  env: {
    SUPABASE_URL: 'https://sgvitxezqrjgjmduoool.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'your-key',
  },
});

const client = new Client({
  name: 'my-client',
  version: '1.0.0',
}, {
  capabilities: {},
});

await client.connect(transport);

// List available tools
const { tools } = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool({
  name: 'query_files',
  arguments: {
    category: 'protocol',
    limit: 5,
  },
});
console.log('Results:', result);
```

## Example Queries

### Query Protocol Files
```javascript
await client.callTool({
  name: 'query_files',
  arguments: {
    category: 'protocol',
    limit: 10,
  },
});
```

### Search File Content
```javascript
await client.callTool({
  name: 'query_files',
  arguments: {
    search_query: 'authentication',
    limit: 5,
  },
});
```

### Get Claude's Files
```javascript
await client.callTool({
  name: 'list_agent_files',
  arguments: {
    agent: 'claude',
  },
});
```

### Add Coordination Message
```javascript
await client.callTool({
  name: 'add_message',
  arguments: {
    agent: 'claude',
    content: 'Task completed successfully',
    metadata: { task_id: '123' },
  },
});
```

## Testing the Server

```bash
# Test the server directly
cd mcp
node supabase-server.js

# The server will start and wait for JSON-RPC messages on stdin
# Press Ctrl+C to exit
```

## Development

### Adding New Tools

Edit `mcp/supabase-server.js` and add to the tools array in `ListToolsRequestSchema` handler:

```javascript
{
  name: 'my_new_tool',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    required: ['param1'],
  },
}
```

Then add the implementation in `CallToolRequestSchema` handler:

```javascript
case 'my_new_tool': {
  // Implementation
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('field', args.param1);

  if (error) throw error;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(data, null, 2),
    }],
  };
}
```

## Troubleshooting

### Server won't start
- Check that dependencies are installed: `npm install`
- Verify `.env` file has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check Node.js version: `node --version` (requires v18+)

### Tools not appearing
- Restart your AI client (Claude Desktop, etc.)
- Check server logs for errors
- Verify `servers.json` syntax is correct

### Database errors
- Ensure Supabase tables exist (run `supabase/files.sql`)
- Check service role key has correct permissions
- Verify project URL is correct

## Security

⚠️ **Important:**
- Never commit `.env` files with real credentials
- Use service role key only server-side (never in client code)
- MCP servers have full database access via service role key

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Supabase Documentation](https://supabase.com/docs)
