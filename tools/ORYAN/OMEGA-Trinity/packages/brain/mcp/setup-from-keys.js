#!/usr/bin/env node

/**
 * MCP Setup Script - Reads keys from keys.env and configures all MCP servers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const MCP_DIR = path.join(__dirname);
const KEYS_ENV_PATH = path.join(ROOT_DIR, 'keys.env');
const MCP_ENV_PATH = path.join(MCP_DIR, '.env');
const MCP_ENV_EXAMPLE = path.join(MCP_DIR, '.env.example');

// Try to read keys from various locations
function readKeys() {
  const keys = {};
  
  // Try keys.env in root
  if (fs.existsSync(KEYS_ENV_PATH)) {
    console.log('📖 Reading keys from keys.env...');
    const content = fs.readFileSync(KEYS_ENV_PATH, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const match = line.match(/([^:]+):\s*(.+)/);
        if (match) {
          const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
          const value = match[2].trim();
          if (value && value !== 'REDACTED') {
            keys[key] = value;
          }
        }
      }
    }
  }
  
  // Also try reading from process.env (if keys are already set)
  const envKeys = {
    'supabase_url': process.env.SUPABASE_URL,
    'supabase_service_role_key': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'supabase_anon_key': process.env.SUPABASE_ANON_KEY,
    'github_token': process.env.GITHUB_TOKEN,
    'openai_api_key': process.env.OPENAI_API_KEY,
    'anthropic_api_key': process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    'gemini_api_key': process.env.GEMINI_API_KEY,
    'grok_api_key': process.env.GROK_API_KEY,
    'deepseek_api_key': process.env.DEEPSEEK_API_KEY,
    'perplexity_api_key': process.env.PERPLEXITY_API_KEY,
    'linear_api_key': process.env.LINEAR_API_KEY,
    'notion_api_key': process.env.NOTION_API_KEY,
    'elevenlabs_api_key': process.env.ELEVENLABS_API_KEY,
    'telegram_bot_token': process.env.TELEGRAM_BOT_TOKEN,
  };
  
  for (const [key, value] of Object.entries(envKeys)) {
    if (value && !keys[key]) {
      keys[key] = value;
    }
  }
  
  return keys;
}

// Map keys to MCP environment variables
function mapKeysToMCPEnv(keys) {
  const mcpEnv = {};
  
  // Core services
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
  if (keys.openai_api_key) {
    mcpEnv.OPENAI_API_KEY = keys.openai_api_key;
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
  
  // Communication
  if (keys.telegram_bot_token) {
    mcpEnv.TELEGRAM_BOT_TOKEN = keys.telegram_bot_token;
  }
  
  // Database
  if (process.env.DATABASE_URL) {
    mcpEnv.DATABASE_URL = process.env.DATABASE_URL;
  }
  if (process.env.REDIS_URL) {
    mcpEnv.REDIS_URL = process.env.REDIS_URL;
  }
  if (process.env.MONGODB_URI) {
    mcpEnv.MONGODB_URI = process.env.MONGODB_URI;
  }
  
  // Neo4j (from brain .env)
  if (process.env.NEO4J_URI) {
    mcpEnv.NEO4J_URI = process.env.NEO4J_URI;
    mcpEnv.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
    mcpEnv.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
  }
  
  // Add defaults for servers that don't need keys
  mcpEnv.MCP_TIMEOUT = process.env.MCP_TIMEOUT || '30';
  mcpEnv.MCP_LOG_LEVEL = process.env.MCP_LOG_LEVEL || 'info';
  
  return mcpEnv;
}

// Create MCP .env file
function createMCPEnv(mcpEnv) {
  console.log('\n🔧 Creating MCP .env file...');
  
  // Read the example file for structure
  let envContent = '';
  if (fs.existsSync(MCP_ENV_EXAMPLE)) {
    envContent = fs.readFileSync(MCP_ENV_EXAMPLE, 'utf8');
  }
  
  // Build the env file content
  const lines = [];
  lines.push('# MCP Environment Configuration');
  lines.push('# Auto-generated from keys.env');
  lines.push('# Generated: ' + new Date().toISOString());
  lines.push('');
  
  // Add all configured keys
  for (const [key, value] of Object.entries(mcpEnv)) {
    if (value) {
      lines.push(`${key}=${value}`);
    }
  }
  
  // Write the file
  fs.writeFileSync(MCP_ENV_PATH, lines.join('\n') + '\n');
  console.log(`✅ Created ${MCP_ENV_PATH}`);
  console.log(`   Configured ${Object.keys(mcpEnv).length} environment variables`);
}

// Main execution
function main() {
  console.log('🚀 MCP Setup from Keys');
  console.log('======================\n');
  
  // Read keys
  const keys = readKeys();
  console.log(`📋 Found ${Object.keys(keys).length} keys`);
  
  if (Object.keys(keys).length === 0) {
    console.warn('⚠️  No keys found!');
    console.warn('   Please create keys.env in the root directory with format:');
    console.warn('   KEY_NAME: value');
    console.warn('   Or set environment variables directly.');
    return;
  }
  
  // Map to MCP env
  const mcpEnv = mapKeysToMCPEnv(keys);
  
  // Create .env file
  createMCPEnv(mcpEnv);
  
  // List configured servers
  console.log('\n📦 Configured MCP Servers:');
  const configuredServers = [];
  
  if (mcpEnv.SUPABASE_URL) configuredServers.push('✅ gaing-supabase');
  if (mcpEnv.GITHUB_TOKEN) configuredServers.push('✅ github');
  if (mcpEnv.OPENAI_API_KEY) configuredServers.push('✅ openai');
  if (mcpEnv.ANTHROPIC_API_KEY) configuredServers.push('✅ anthropic');
  if (mcpEnv.GEMINI_API_KEY) configuredServers.push('✅ gemini');
  if (mcpEnv.GROK_API_KEY) configuredServers.push('✅ grok');
  if (mcpEnv.DEEPSEEK_API_KEY) configuredServers.push('✅ deepseek');
  if (mcpEnv.PERPLEXITY_API_KEY) configuredServers.push('✅ perplexity');
  if (mcpEnv.LINEAR_API_KEY) configuredServers.push('✅ linear');
  if (mcpEnv.NOTION_API_KEY) configuredServers.push('✅ notion');
  if (mcpEnv.ELEVENLABS_API_KEY) configuredServers.push('✅ elevenlabs');
  if (mcpEnv.TELEGRAM_BOT_TOKEN) configuredServers.push('✅ telegram');
  if (mcpEnv.DATABASE_URL) configuredServers.push('✅ postgres');
  if (mcpEnv.REDIS_URL) configuredServers.push('✅ redis');
  if (mcpEnv.MONGODB_URI) configuredServers.push('✅ mongodb');
  if (mcpEnv.NEO4J_URI) configuredServers.push('✅ neo4j');
  
  configuredServers.forEach(s => console.log(`   ${s}`));
  
  // Servers that don't need keys
  console.log('\n📦 Servers Available Without Keys:');
  console.log('   ✅ filesystem');
  console.log('   ✅ memory');
  console.log('   ✅ git');
  console.log('   ✅ time');
  console.log('   ✅ fetch');
  console.log('   ✅ sequential-thinking');
  console.log('   ✅ docker');
  console.log('   ✅ terraform');
  console.log('   ✅ playwright');
  console.log('   ✅ puppeteer');
  
  console.log('\n✨ Setup complete!');
  console.log('   Next: Run npm run setup-mcp to configure Claude Desktop');
}

main();
