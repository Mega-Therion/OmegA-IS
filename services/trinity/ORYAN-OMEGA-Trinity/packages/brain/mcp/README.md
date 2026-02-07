# gAIng-Brain MCP Servers

Model Context Protocol (MCP) servers for the gAIng-Brain multi-agent system.

## What is MCP?

MCP (Model Context Protocol) is a standard protocol that lets AI agents interact with external data sources and tools. It provides a unified interface for AI models to query databases, search files, and perform actions.

## Available Servers

This repository includes **100+ MCP servers** organized by category. Here are the key servers:

### Core & Custom Servers

#### 1. gaing-supabase (Custom)
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

#### 2. filesystem (Official)
Access to local filesystem operations.

#### 3. github (Official)
GitHub repository integration - manage repos, issues, PRs, and more.

#### 4. memory (Official)
Knowledge graph-based persistent memory system.

#### 5. git (Official)
Tools to read, search, and manipulate Git repositories.

#### 6. time (Official)
Time and timezone conversion capabilities.

#### 7. fetch (Official)
Web content fetching and conversion for efficient LLM usage.

#### 8. sequential-thinking (Official)
Dynamic and reflective problem-solving through thought sequences.

### Web Search & Research

- **tavily** - AI-powered search engine for agents
- **brave-search** - Web search using Brave Search API

### Databases & Data Stores

- **postgres** - PostgreSQL database access
- **sqlite** - SQLite database operations
- **mongodb** - MongoDB database integration
- **redis** - Redis key-value store operations
- **neo4j** - Neo4j graph database
- **bigquery** - Google BigQuery data warehouse
- **snowflake** - Snowflake data warehouse
- **databricks** - Databricks platform integration

### Vector Databases & AI

- **pinecone** - Pinecone vector database
- **qdrant** - Qdrant vector search engine
- **chroma** - Chroma vector database
- **milvus** - Milvus vector database
- **elasticsearch** - Elasticsearch search and analytics

### Project Management & Collaboration

- **notion** - Notion workspace integration
- **linear** - Linear issue tracking
- **todoist** - Todoist task management
- **jira** - Jira project management
- **confluence** - Confluence documentation
- **asana** - Asana project management
- **clickup** - ClickUp task management
- **monday** - Monday.com work management
- **trello** - Trello board management

### Communication & Messaging

- **slack** - Slack workspace integration
- **discord** - Discord bot integration
- **telegram** - Telegram bot operations
- **twilio** - Twilio SMS and voice
- **sendgrid** - SendGrid email service
- **mailgun** - Mailgun email service
- **resend** - Resend email service

### Design & Development

- **figma** - Figma design file access
- **webflow** - Webflow CMS integration
- **vercel** - Vercel deployment platform
- **netlify** - Netlify hosting platform
- **cloudflare** - Cloudflare CDN and services
- **playwright** - Browser automation
- **puppeteer** - Headless browser automation

### AI & ML Services

- **elevenlabs** - Text-to-speech generation
- **replicate** - ML model hosting and inference
- **huggingface** - Hugging Face model hub
- **openai** - OpenAI API integration
- **anthropic** - Anthropic Claude API

### Infrastructure & DevOps

- **docker** - Docker container management
- **kubernetes** - Kubernetes cluster operations
- **terraform** - Infrastructure as Code
- **pulumi** - Cloud infrastructure management
- **aws** - AWS services integration
- **azure** - Microsoft Azure services
- **google-cloud** - Google Cloud Platform services

### Monitoring & Observability

- **datadog** - Datadog monitoring and analytics
- **sentry** - Sentry error tracking
- **grafana** - Grafana dashboards and metrics
- **prometheus** - Prometheus monitoring
- **newrelic** - New Relic APM

### E-commerce & Payments

- **stripe** - Stripe payment processing
- **shopify** - Shopify store management

### Social Media & Content

- **twitter** - Twitter/X API integration
- **linkedin** - LinkedIn API access
- **youtube** - YouTube API operations
- **spotify** - Spotify API integration
- **wordpress** - WordPress CMS management

### CRM & Business Tools

- **airtable** - Airtable database platform
- **hubspot** - HubSpot CRM integration
- **salesforce** - Salesforce CRM operations

### Automation & Workflows

- **zapier** - Zapier automation platform
- **make** - Make (Integromat) workflows
- **n8n** - n8n workflow automation

### Analytics

- **posthog** - PostHog product analytics
- **mixpanel** - Mixpanel user analytics
- **amplitude** - Amplitude behavioral analytics

## Complete Server List

The `servers.json` file contains **100+ configured MCP servers**. To see all available servers, check the configuration file:

```bash
cat mcp/servers.json | jq '.servers[].name'
```

## Quick Setup

1. **Copy environment template:**
   ```bash
   cp mcp/.env.example mcp/.env
   ```

2. **Fill in your credentials** in `mcp/.env` for the servers you want to use

3. **Start MCP servers** using the setup script:
   ```bash
   npm run setup-mcp
   ```

4. **Verify servers are running:**
   ```bash
   npm run validate-mcp
   ```

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
