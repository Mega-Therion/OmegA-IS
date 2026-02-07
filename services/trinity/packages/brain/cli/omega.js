#!/usr/bin/env node
/**
 * OMEGA CLI - Command Line Interface for OmegAI Brain
 * 
 * Access your gAIng-Brain from the terminal.
 * 
 * Usage:
 *   omega chat "message"       - Chat with agents
 *   omega status               - System status
 *   omega agents               - List agents
 *   omega mission <action>     - Manage missions
 *   omega config               - Configure CLI
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  apiUrl: process.env.OMEGA_API_URL || 'http://localhost:8080',
  agent: process.env.OMEGA_AGENT || 'gemini',
  verbose: process.env.OMEGA_VERBOSE === '1'
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

// Helper to colorize output
const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Banner
const banner = `
${c('cyan', '╔═══════════════════════════════════════════════════════════╗')}
${c('cyan', '║')}  ${c('bright', '🧠 OMEGA CLI')} - OmegAI Brain Command Interface           ${c('cyan', '║')}
${c('cyan', '║')}     ${c('dim', 'Connected to:')} ${CONFIG.apiUrl}                    ${c('cyan', '║')}
${c('cyan', '╚═══════════════════════════════════════════════════════════╝')}
`;

// API request helper
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.apiUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OMEGA-CLI/1.0.0'
      }
    };
    
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Commands
const commands = {
  async chat(args) {
    const message = args.join(' ');
    if (!message) {
      console.log(c('yellow', 'Usage: omega chat "your message"'));
      return;
    }
    
    console.log(c('dim', `\n[${CONFIG.agent}] Processing...`));
    
    try {
      const response = await apiRequest('POST', '/chat', {
        prompt: message,
        agent: CONFIG.agent,
        context: []
      });
      
      if (response.status === 200 && response.data.reply) {
        console.log(`\n${c('cyan', '🤖 ' + CONFIG.agent.toUpperCase())}:`);
        console.log(response.data.reply);
      } else {
        console.log(c('yellow', 'Response:'), response.data);
      }
    } catch (error) {
      console.log(c('red', 'Error:'), error.message);
      console.log(c('dim', 'Is the gAIng-Brain server running?'));
    }
  },
  
  async status() {
    console.log(c('cyan', '\n📊 System Status\n'));
    
    try {
      const response = await apiRequest('GET', '/health');
      
      if (response.status === 200) {
        console.log(c('green', '● Server: Online'));
        console.log(c('dim', `  URL: ${CONFIG.apiUrl}`));
        
        if (response.data.database) {
          console.log(c('green', '● Database: Connected'));
        }
        if (response.data.memory) {
          console.log(c('green', '● Memory: Active'));
        }
      } else {
        console.log(c('red', '○ Server: Error'));
      }
    } catch (error) {
      console.log(c('red', '○ Server: Offline'));
      console.log(c('dim', `  ${error.message}`));
    }
  },
  
  async agents() {
    console.log(c('cyan', '\n🤖 Available Agents\n'));
    
    const agents = [
      { id: 'gemini', name: 'Gemini', desc: 'Planning & Strategy', status: '●' },
      { id: 'claude', name: 'Claude', desc: 'Deep Reasoning', status: '●' },
      { id: 'codex', name: 'Codex', desc: 'Code Execution', status: '●' },
      { id: 'grok', name: 'Grok', desc: 'Real-time Search', status: '●' }
    ];
    
    agents.forEach(agent => {
      const current = agent.id === CONFIG.agent ? c('green', ' (active)') : '';
      console.log(`${c('green', agent.status)} ${c('bright', agent.name)}${current}`);
      console.log(`  ${c('dim', agent.desc)}`);
    });
    
    console.log(c('dim', `\nSwitch agent: export OMEGA_AGENT=<name>`));
  },
  
  async mission(args) {
    const action = args[0];
    
    if (!action) {
      console.log(c('cyan', '\n📋 Mission Commands\n'));
      console.log('  omega mission list      - List all missions');
      console.log('  omega mission create    - Create new mission');
      console.log('  omega mission status    - Current mission status');
      return;
    }
    
    switch (action) {
      case 'list':
        try {
          const response = await apiRequest('GET', '/missions');
          if (response.data && Array.isArray(response.data)) {
            console.log(c('cyan', '\n📋 Missions\n'));
            response.data.forEach((m, i) => {
              const status = m.status === 'completed' ? c('green', '✓') : c('yellow', '○');
              console.log(`${status} ${m.title || m.objective}`);
            });
          }
        } catch (error) {
          console.log(c('red', 'Error fetching missions'));
        }
        break;
        
      case 'create':
        console.log(c('yellow', 'Interactive mission creation coming soon...'));
        console.log(c('dim', 'Use: omega chat "Create a mission to..."'));
        break;
        
      case 'status':
        console.log(c('yellow', 'Mission status coming soon...'));
        break;
        
      default:
        console.log(c('red', `Unknown action: ${action}`));
    }
  },
  
  async config() {
    console.log(c('cyan', '\n⚙️ Configuration\n'));
    console.log(`API URL:  ${c('green', CONFIG.apiUrl)}`);
    console.log(`Agent:    ${c('green', CONFIG.agent)}`);
    console.log(`Verbose:  ${c('green', CONFIG.verbose ? 'Yes' : 'No')}`);
    console.log(c('dim', '\nEnvironment variables:'));
    console.log(c('dim', '  OMEGA_API_URL  - API endpoint'));
    console.log(c('dim', '  OMEGA_AGENT    - Default agent'));
    console.log(c('dim', '  OMEGA_VERBOSE  - Verbose output (1/0)'));
  },
  
  async interactive() {
    console.log(banner);
    console.log(c('dim', 'Type your message and press Enter. Type "exit" to quit.\n'));
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const prompt = () => {
      rl.question(c('cyan', 'omega> '), async (input) => {
        const trimmed = input.trim();
        
        if (trimmed === 'exit' || trimmed === 'quit') {
          console.log(c('dim', '\nGoodbye! 👋'));
          rl.close();
          return;
        }
        
        if (trimmed === '') {
          prompt();
          return;
        }
        
        // Check for commands
        if (trimmed.startsWith('/')) {
          const [cmd, ...args] = trimmed.slice(1).split(' ');
          if (commands[cmd]) {
            await commands[cmd](args);
          } else {
            console.log(c('yellow', `Unknown command: ${cmd}`));
            console.log(c('dim', 'Available: /status, /agents, /mission, /config'));
          }
        } else {
          // Chat mode
          await commands.chat([trimmed]);
        }
        
        console.log('');
        prompt();
      });
    };
    
    prompt();
  },
  
  help() {
    console.log(`
${c('cyan', 'OMEGA CLI')} - OmegAI Brain Command Interface

${c('bright', 'Usage:')}
  omega <command> [options]

${c('bright', 'Commands:')}
  chat <message>    Chat with an agent
  status            Show system status
  agents            List available agents
  mission <action>  Manage missions
  config            Show configuration
  interactive       Start interactive mode
  help              Show this help

${c('bright', 'Examples:')}
  omega chat "What is the status of project Omega?"
  omega status
  omega agents
  omega mission list
  omega interactive

${c('bright', 'Environment:')}
  OMEGA_API_URL     API endpoint (default: http://localhost:8080)
  OMEGA_AGENT       Default agent (default: gemini)
`);
  }
};

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    // Default to interactive mode
    await commands.interactive();
    return;
  }
  
  if (commands[command]) {
    await commands[command](args.slice(1));
  } else if (command === '--help' || command === '-h') {
    commands.help();
  } else {
    // Treat as chat message
    await commands.chat(args);
  }
}

main().catch(console.error);
