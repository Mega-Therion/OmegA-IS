#!/usr/bin/env node

/**
 * Complete MCP Setup - Reads from keys.env and configures everything
 * This will work once keys.env exists with your actual keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MCP_DIR = path.join(__dirname);
const KEYS_ENV = path.join(ROOT_DIR, 'keys.env');

function readKeysEnv() {
  if (!fs.existsSync(KEYS_ENV)) {
    console.log(`\n⚠️  keys.env not found at: ${KEYS_ENV}`);
    console.log('   The setup will proceed with servers that don\'t need keys.');
    console.log('   Once you create keys.env, run this script again to configure all servers.\n');
    return {};
  }
  
  console.log(`✅ Reading keys from: ${path.relative(ROOT_DIR, KEYS_ENV)}\n`);
  
  const keys = {};
  const content = fs.readFileSync(KEYS_ENV, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
      // Try KEY: value format
      let match = line.match(/([^:]+):\s*(.+)/);
      if (match) {
        const key = match[1].trim().toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[@]/g, '')
          .replace(/[^a-z0-9_]/g, '');
        const value = match[2].trim();
        if (value && value.length > 5 && !value.includes('your-') && value !== 'REDACTED') {
          keys[key] = value;
          console.log(`   ✓ Found: ${key}`);
        }
      } else {
        // Try KEY=value format
        match = line.match(/([^=]+)=(.+)/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (value && value.length > 5 && !value.includes('your-') && value !== 'REDACTED') {
            keys[key.toLowerCase()] = value;
            console.log(`   ✓ Found: ${key}`);
          }
        }
      }
    }
  }
  
  return keys;
}

function mapToMCPEnv(keys) {
  const mcpEnv = {};
  
  // Supabase
  if (keys.supabase_url || keys.supabase_project_url) {
    mcpEnv.SUPABASE_URL = keys.supabase_url || keys.supabase_project_url;
  }
  if (keys.supabase_service_role_key) {
    mcpEnv.SUPABASE_SERVICE_ROLE_KEY = keys.supabase_service_role_key;
  }
  if (keys.supabase_anon_key || keys.supabase_secret_key) {
    mcpEnv.SUPABASE_ANON_KEY = keys.supabase_anon_key || keys.supabase_secret_key;
  }
  
  // GitHub
  if (keys.github_token || keys.github_access_token) {
    mcpEnv.GITHUB_TOKEN = keys.github_token || keys.github_access_token;
  }
  
  // AI Services
  if (keys.openai_api_key || keys.openai_service_role_key) {
    mcpEnv.OPENAI_API_KEY = keys.openai_api_key || keys.openai_service_role_key;
  }
  if (keys.anthropic_api_key || keys.claude_api_key) {
    mcpEnv.ANTHROPIC_API_KEY = keys.anthropic_api_key || keys.claude_api_key;
  }
  if (keys.gemini_api_key) {
    mcpEnv.GEMINI_API_KEY = keys.gemini_api_key;
  }
  if (keys.grok_api_key) {
    mcpEnv.GROK_API_KEY = keys.grok_api_key;
  }
  if (keys.deepseek_api_key) {
    mcpEnv.DEEPSEEK_API_KEY = keys.deepseek_api_key;
  }
  if (keys.perplexity_api_key) {
    mcpEnv.PERPLEXITY_API_KEY = keys.perplexity_api_key;
  }
  
  // Project Management
  if (keys.linear_api_key) {
    mcpEnv.LINEAR_API_KEY = keys.linear_api_key;
  }
  if (keys.notion_api_key || keys.notion_internal_token) {
    mcpEnv.NOTION_API_KEY = keys.notion_api_key || keys.notion_internal_token;
  }
  
  // Voice
  if (keys.elevenlabs_api_key || keys.eleven_labs_api_key) {
    mcpEnv.ELEVENLABS_API_KEY = keys.elevenlabs_api_key || keys.eleven_labs_api_key;
  }
  
  // Telegram (use first available)
  const telegramKeys = [
    keys.telegram_bot_token,
    keys.telegram_safa_says_bot_token,
    keys.telegram_grok_gaing_bot,
    keys.telegram_claude_gaing_bot_token,
    keys.telegram_gemini_gaing_bot_token,
    keys.telegram_perplexity_gaing_bot_token,
    keys.telegram_codex_gaing_bot_token,
  ].filter(Boolean);
  
  if (telegramKeys.length > 0) {
    mcpEnv.TELEGRAM_BOT_TOKEN = telegramKeys[0];
  }
  
  // Databases from process.env
  if (process.env.DATABASE_URL) mcpEnv.DATABASE_URL = process.env.DATABASE_URL;
  if (process.env.REDIS_URL) mcpEnv.REDIS_URL = process.env.REDIS_URL;
  if (process.env.MONGODB_URI) mcpEnv.MONGODB_URI = process.env.MONGODB_URI;
  if (process.env.NEO4J_URI) {
    mcpEnv.NEO4J_URI = process.env.NEO4J_URI;
    mcpEnv.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
    mcpEnv.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
  }
  
  mcpEnv.MCP_TIMEOUT = '30';
  mcpEnv.MCP_LOG_LEVEL = 'info';
  
  return mcpEnv;
}

function createMCPEnv(mcpEnv) {
  const envPath = path.join(MCP_DIR, '.env');
  
  const lines = [];
  lines.push('# MCP Environment Configuration');
  lines.push('# Auto-generated from keys.env');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  const categories = {
    'Core Services': ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'GITHUB_TOKEN', 'DATABASE_URL'],
    'AI Services': ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GROK_API_KEY', 'DEEPSEEK_API_KEY', 'PERPLEXITY_API_KEY'],
    'Project Management': ['LINEAR_API_KEY', 'NOTION_API_KEY'],
    'Communication': ['TELEGRAM_BOT_TOKEN'],
    'Voice': ['ELEVENLABS_API_KEY'],
    'Databases': ['REDIS_URL', 'MONGODB_URI', 'NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD'],
    'Configuration': ['MCP_TIMEOUT', 'MCP_LOG_LEVEL'],
  };
  
  for (const [category, vars] of Object.entries(categories)) {
    const sectionVars = vars.filter(v => mcpEnv[v]);
    if (sectionVars.length > 0) {
      lines.push(`# ${category}`);
      lines.push('');
      for (const varName of sectionVars) {
        lines.push(`${varName}=${mcpEnv[varName]}`);
      }
      lines.push('');
    }
  }
  
  fs.writeFileSync(envPath, lines.join('\n'));
  return envPath;
}

async function setupClaudeDesktop() {
  const os = await import('os');
  const APPDATA = process.env.APPDATA || path.join(os.default.homedir(), 'AppData', 'Roaming');
  const CLAUDE_CONFIG_DIR = path.join(APPDATA, 'Claude');
  const CLAUDE_CONFIG_FILE = path.join(CLAUDE_CONFIG_DIR, 'claude_desktop_config.json');
  
  // Only set up on Windows for now
  if (process.platform !== 'win32') {
    console.log('   ℹ️  Claude Desktop config (Windows only - skipping)');
    return;
  }
  
  try {
    const serversConfig = JSON.parse(fs.readFileSync(path.join(MCP_DIR, 'servers.json'), 'utf8'));
    const mcpEnv = {};
    
    // Read MCP .env if it exists
    const envPath = path.join(MCP_DIR, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      for (const line of envLines) {
        if (line.trim() && !line.startsWith('#')) {
          const match = line.match(/([^=]+)=(.+)/);
          if (match) {
            mcpEnv[match[1].trim()] = match[2].trim();
          }
        }
      }
    }
    
    const mcpServers = {};
    const rootAbs = path.resolve(ROOT_DIR);
    
    serversConfig.servers.forEach(server => {
      const serverConfig = {
        command: server.command,
        args: server.args.map(arg => {
          if (arg === '.') return rootAbs;
          if (arg.startsWith('mcp/')) {
            return path.join(rootAbs, 'packages', 'brain', arg);
          }
          return arg;
        }),
      };
      
      if (server.env) {
        serverConfig.env = {};
        for (const [key, value] of Object.entries(server.env)) {
          if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
            const envVar = value.slice(2, -1);
            if (mcpEnv[envVar]) {
              serverConfig.env[key] = mcpEnv[envVar];
            }
          } else {
            serverConfig.env[key] = value;
          }
        }
        if (Object.keys(serverConfig.env).length === 0) {
          delete serverConfig.env;
        }
      }
      
      mcpServers[server.name] = serverConfig;
    });
    
    if (!fs.existsSync(CLAUDE_CONFIG_DIR)) {
      fs.mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
    }
    
    const claudeConfig = { mcpServers };
    fs.writeFileSync(CLAUDE_CONFIG_FILE, JSON.stringify(claudeConfig, null, 2));
    console.log(`   ✅ Claude Desktop config: ${CLAUDE_CONFIG_FILE}`);
  } catch (error) {
    console.log(`   ⚠️  Claude Desktop config skipped: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Complete MCP Setup');
  console.log('=====================\n');
  
  const keys = readKeysEnv();
  const keyCount = Object.keys(keys).length;
  
  if (keyCount > 0) {
    console.log(`\n📋 Found ${keyCount} keys from keys.env\n`);
  }
  
  const mcpEnv = mapToMCPEnv(keys);
  const envPath = createMCPEnv(mcpEnv);
  
  console.log(`✅ Created ${path.relative(ROOT_DIR, envPath)}`);
  const configuredCount = Object.values(mcpEnv).filter(v => v).length;
  console.log(`   Configured ${configuredCount} environment variables\n`);
  
  // List configured servers
  console.log('📦 Configured MCP Servers:\n');
  const servers = [];
  
  if (mcpEnv.SUPABASE_URL) servers.push('✅ gaing-supabase');
  if (mcpEnv.GITHUB_TOKEN) servers.push('✅ github');
  if (mcpEnv.OPENAI_API_KEY) servers.push('✅ openai');
  if (mcpEnv.ANTHROPIC_API_KEY) servers.push('✅ anthropic');
  if (mcpEnv.GEMINI_API_KEY) servers.push('✅ gemini');
  if (mcpEnv.GROK_API_KEY) servers.push('✅ grok');
  if (mcpEnv.DEEPSEEK_API_KEY) servers.push('✅ deepseek');
  if (mcpEnv.PERPLEXITY_API_KEY) servers.push('✅ perplexity');
  if (mcpEnv.LINEAR_API_KEY) servers.push('✅ linear');
  if (mcpEnv.NOTION_API_KEY) servers.push('✅ notion');
  if (mcpEnv.ELEVENLABS_API_KEY) servers.push('✅ elevenlabs');
  if (mcpEnv.TELEGRAM_BOT_TOKEN) servers.push('✅ telegram');
  if (mcpEnv.DATABASE_URL) servers.push('✅ postgres');
  if (mcpEnv.REDIS_URL) servers.push('✅ redis');
  if (mcpEnv.MONGODB_URI) servers.push('✅ mongodb');
  if (mcpEnv.NEO4J_URI) servers.push('✅ neo4j');
  
  if (servers.length > 0) {
    servers.forEach(s => console.log(`   ${s}`));
  } else {
    console.log('   ⚠️  No servers configured with keys (using keys.env)');
  }
  
  console.log('\n📦 Servers Available Without Keys:');
  ['filesystem', 'memory', 'git', 'time', 'fetch', 'sequential-thinking', 'docker', 'terraform', 'playwright', 'puppeteer'].forEach(s => console.log(`   ✅ ${s}`));
  
  // Setup Claude Desktop
  console.log('\n🔧 Setting up integrations...');
  await setupClaudeDesktop();
  
  console.log(`\n✨ Setup complete!`);
  console.log(`   Total: ${servers.length + 10} servers available`);
  if (keyCount > 0) {
    console.log(`   Configured: ${servers.length} servers with your keys`);
  } else {
    console.log(`   Add keys to keys.env to enable more servers`);
  }
}

main();
