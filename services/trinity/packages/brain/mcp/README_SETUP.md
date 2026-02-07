# MCP Setup - Quick Start

## Your keys.env file

Since you mentioned your actual keys are in `keys.env`, here's how to proceed:

### 1. Verify keys.env location

Make sure `keys.env` is in the root directory:
```bash
cd /home/mega/ORYAN/OMEGA-Trinity
ls -la keys.env
```

### 2. Run the setup

Once `keys.env` is in place, run:
```bash
cd packages/brain
npm run mcp:setup
```

Or directly:
```bash
node packages/brain/mcp/auto-setup.mjs
```

### 3. What will be configured

The script will automatically:
- ✅ Read all keys from `keys.env`
- ✅ Map them to MCP environment variables
- ✅ Create `mcp/.env` with all configurations
- ✅ Enable all possible MCP servers
- ✅ Show which servers are ready to use

## Expected keys.env format

Your `keys.env` should look like:
```
supabase project url: https://your-project.supabase.co
supabase service role key: eyJhbGc...
github access token: ghp_xxxxxxxxxxxx
openai api key: sk-xxxxxxxxxxxx
claude api key: sk-ant-xxxxxxxxxxxx
gemini api key: xxxxxxxxxxxx
grok api key: xxxxxxxxxxxx
deepseek api key: xxxxxxxxxxxx
Perplexity API Key: pplx-xxxxxxxxxxxx
linear api key: xxxxxxxxxxxx
notion internal token: secret_xxxxxxxxxxxx
eleven labs api key: xxxxxxxxxxxx
telegram @safa says bot token: xxxxxxxxxxxx
```

## After Setup

Once configured, you'll have access to:
- **10+ servers** that work without keys (filesystem, memory, git, etc.)
- **All servers** that match your available keys
- **100+ total servers** available in `servers.json`

## Troubleshooting

If keys aren't being read:
1. Check file location: `/home/mega/ORYAN/OMEGA-Trinity/keys.env`
2. Verify format: `KEY_NAME: value` (colon separated)
3. Make sure values are not REDACTED or placeholders
4. Check file permissions: `chmod 600 keys.env`

## Next: Run Setup

```bash
cd /home/mega/ORYAN/OMEGA-Trinity/packages/brain
npm run mcp:setup
```
