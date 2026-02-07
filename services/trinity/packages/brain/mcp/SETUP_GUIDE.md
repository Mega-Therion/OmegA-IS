# MCP Setup Guide

This guide will help you configure all MCP servers using your API keys.

## Quick Start

1. **Create keys.env file** in the root directory (`/home/mega/ORYAN/OMEGA-Trinity/keys.env`)

2. **Add your keys** in this format:
   ```
   supabase project url: https://your-project.supabase.co
   supabase service role key: your-key-here
   github access token: ghp_your-token
   openai api key: sk-your-key
   claude api key: sk-ant-your-key
   gemini api key: your-key
   grok api key: your-key
   deepseek api key: your-key
   Perplexity API Key: pplx-your-key
   linear api key: your-key
   notion internal token: your-token
   eleven labs api key: your-key
   telegram @safa says bot token: your-token
   ```

3. **Run the setup script:**
   ```bash
   cd packages/brain
   npm run mcp:setup
   ```

4. **Verify configuration:**
   ```bash
   npm run mcp:validate
   ```

## Available MCP Servers

### ✅ Already Configured (No Keys Needed)
- **filesystem** - Local file operations
- **memory** - Persistent memory system
- **git** - Git repository operations
- **time** - Time and timezone utilities
- **fetch** - Web content fetching
- **sequential-thinking** - Problem-solving tools
- **docker** - Docker container management
- **terraform** - Infrastructure as Code
- **playwright** - Browser automation
- **puppeteer** - Headless browser

### 🔑 Requires API Keys

Based on your available keys, these servers can be configured:

#### Core Services
- **gaing-supabase** - Your custom Supabase server ✅
- **github** - GitHub integration ✅
- **postgres** - PostgreSQL database (if DATABASE_URL set)
- **redis** - Redis cache (if REDIS_URL set)
- **mongodb** - MongoDB database (if MONGODB_URI set)
- **neo4j** - Neo4j graph database (if NEO4J_URI set)

#### AI Services
- **openai** - OpenAI API ✅
- **anthropic** - Claude API ✅
- **gemini** - Google Gemini ✅
- **grok** - xAI Grok ✅
- **deepseek** - DeepSeek AI ✅
- **perplexity** - Perplexity AI ✅
- **elevenlabs** - Text-to-speech ✅

#### Project Management
- **linear** - Linear issue tracking ✅
- **notion** - Notion workspace ✅

#### Communication
- **telegram** - Telegram bot ✅

## Configuration Files

- **`mcp/servers.json`** - MCP server definitions (100+ servers)
- **`mcp/.env`** - Environment variables (auto-generated)
- **`keys.env`** - Your API keys (create this in root directory)

## Next Steps

1. **Add more keys** to `keys.env` to enable more servers
2. **Check available servers** in `mcp/servers.json`
3. **Start MCP servers** using the setup scripts
4. **Integrate with Claude Desktop** or other MCP clients

## Troubleshooting

### No keys found
- Make sure `keys.env` exists in the root directory
- Check the file format (KEY: value)
- Verify keys are not marked as "REDACTED"

### Server not starting
- Check that the API key is valid
- Verify the server package is installed
- Check server logs for errors

### Missing dependencies
- Run `npm install` in `packages/brain`
- Some servers require `npx` to download packages on first use

## Integration with Other Services

The MCP servers can also integrate with:
- **Claude Desktop** - Add to `claude_desktop_config.json`
- **Cursor IDE** - Configure in Cursor settings
- **Windsurf** - Add to Windsurf configuration
- **Custom clients** - Use the MCP SDK

For more information, see the [MCP README](README.md).
