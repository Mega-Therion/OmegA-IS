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
const os = require('os');

// Configuration
const CONFIG = {
  apiUrl: process.env.OMEGA_API_URL || 'http://localhost:8080',
  agent: process.env.OMEGA_AGENT || process.env.DEFAULT_AI_MODE || 'openai',
  verbose: process.env.OMEGA_VERBOSE === '1',
  token: process.env.OMEGA_API_TOKEN || process.env.GAING_SHARED_TOKEN || '',
  useTools: process.env.OMEGA_USE_TOOLS !== '0',
  toolNames: process.env.OMEGA_TOOL_NAMES || ''
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Helper to colorize output
const c = (color, text) => `${colors[color]}${text}${colors.reset}`;

// UI helpers
const hr = (ch = '─', len = 56) => ch.repeat(len);
const now = () => new Date().toLocaleTimeString();
const pad = (s, n) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
const block = (title, lines) => {
  const w = 62;
  const top = `╭${hr('─', w - 2)}╮`;
  const mid = lines.map(l => `│ ${pad(l, w - 4)} │`).join('\n');
  const head = `│ ${pad(title, w - 4)} │`;
  const sep = `├${hr('─', w - 2)}┤`;
  const bot = `╰${hr('─', w - 2)}╯`;
  return `${top}\n${head}\n${sep}\n${mid}\n${bot}`;
};
const statusBar = () => {
  const mode = process.env.OMEGA_VOICE === '1' ? 'voice' : 'text';
  const tools = CONFIG.useTools ? 'tools:on' : 'tools:off';
  return (
    c('gray', `(${now()})`) +
    ' ' +
    c('dim', `mode=${mode}`) +
    ' ' +
    c('dim', `agent=${CONFIG.agent}`) +
    ' ' +
    c('dim', tools) +
    ' ' +
    c('dim', `api=${CONFIG.apiUrl}`)
  );
};

const spinnerFrames = ['α', 'ω', 'α', 'ω'];
const startSpinner = (label) => {
  let i = 0;
  const render = () => {
    const glyph = spinnerFrames[i % spinnerFrames.length];
    process.stdout.write('\r\x1b[K' + c('dim', `${glyph} ${label}`));
  };
  render();
  const t = setInterval(() => {
    i += 1;
    render();
  }, 120);
  return () => {
    clearInterval(t);
    process.stdout.write('\r\x1b[K');
  };
};

const startMeter = (label, width = 18) => {
  let i = 0;
  const render = () => {
    const glyph = spinnerFrames[i % spinnerFrames.length];
    const filled = i % (width + 1);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    process.stdout.write('\r\x1b[K' + c('dim', `${glyph} ${label} [${bar}]`));
  };
  render();
  const t = setInterval(() => {
    i += 1;
    render();
  }, 90);
  return () => {
    clearInterval(t);
    process.stdout.write('\r\x1b[K');
  };
};

const promptLabel = () => {
  const agent = c('dim', CONFIG.agent);
  return `${c('cyan', 'Ω')} ${agent} `;
};

const fmtPct = (v) => `${Math.round(v * 10) / 10}%`;
const sysLine = () => {
  const load = os.loadavg()[0];
  const mem = 1 - os.freemem() / os.totalmem();
  return c('gray', `CPU ${load.toFixed(2)}  RAM ${fmtPct(mem * 100)}`);
};

const wrapText = (text, width) => {
  const out = [];
  const words = text.split(/\s+/);
  let line = '';
  words.forEach((w) => {
    if (!line) {
      line = w;
      return;
    }
    if ((line + ' ' + w).length <= width) {
      line += ' ' + w;
    } else {
      out.push(line);
      line = w;
    }
  });
  if (line) out.push(line);
  return out;
};

const streamText = async (text, cps = 120, indent = 2) => {
  if (!text) return;
  const delay = Math.max(2, Math.floor(1000 / cps));
  const prefix = ' '.repeat(Math.max(0, indent));
  let lineStart = true;
  for (const ch of text) {
    if (lineStart) {
      process.stdout.write(prefix);
      lineStart = false;
    }
    process.stdout.write(ch);
    if (ch === '\n') lineStart = true;
    await new Promise(r => setTimeout(r, delay));
  }
  process.stdout.write('\n');
};

const messageBox = (label, text, color = 'bright') => {
  const width = 72;
  const top = `╭${hr('─', width - 2)}╮`;
  const head = `│ ${pad(c(color, label), width - 4)} │`;
  const sep = `├${hr('─', width - 2)}┤`;
  const lines = wrapText(text, width - 4).map(l => `│ ${pad(l, width - 4)} │`);
  const body = lines.join('\n');
  const bot = `╰${hr('─', width - 2)}╯`;
  return `${top}\n${head}\n${sep}\n${body}\n${bot}`;
};

const modeStrip = () => {
  const m = process.env.OMEGA_VOICE === '1' ? 'Voice' : 'Text';
  const t = CONFIG.useTools ? 'Tools' : 'No‑Tools';
  return c('dim', `Mode: ${m}  ·  ${t}  ·  Agent: ${CONFIG.agent}`);
};

// Banner
const banner = `
${block(c('bright', 'OmegA CLI') + c('dim', '  —  local brain interface'), [
  c('dim', 'Fast. Local. Tool-enabled.'),
  statusBar()
])}
`;

// API request helper
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.apiUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'OMEGA-CLI/1.0.0'
    };

    if (CONFIG.token) {
      headers.Authorization = `Bearer ${CONFIG.token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers
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
    const youLabel = `You @ ${now()}`;
    console.log('\n' + messageBox(youLabel, message, 'cyan'));
    console.log(c('dim', sysLine()));
    const stopSpin = startMeter('OmegA is thinking');
    
    try {
      const payload = {
        messages: [{ role: 'user', content: message }],
        provider: CONFIG.agent,
        maxToolIterations: 5
      };

      if (CONFIG.useTools) {
        if (CONFIG.toolNames.trim()) {
          payload.toolNames = CONFIG.toolNames.split(',').map(name => name.trim()).filter(Boolean);
        }
        const response = await apiRequest('POST', '/v2/llm/tools', payload);
        stopSpin();
        if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
          const reply = response.data.choices[0].message.content.trim();
          console.log(`\n${c('magenta', 'OmegA')} ${c('gray', '@')} ${c('dim', now())}`);
          await streamText(reply, 150, 2);
        } else {
        console.log(c('yellow', 'Response:'), response.data);
      }
      console.log(c('gray', hr('·', 56)));
      return;
    }

      const response = await apiRequest('POST', '/v2/llm/chat', {
        messages: [{ role: 'user', content: message }],
        provider: CONFIG.agent
      });
      stopSpin();
      
      if (response.status === 200 && response.data?.choices?.[0]?.message?.content) {
        const reply = response.data.choices[0].message.content.trim();
        console.log(`\n${c('magenta', 'OmegA')} ${c('gray', '@')} ${c('dim', now())}`);
        await streamText(reply, 150, 2);
      } else {
        console.log(c('yellow', 'Response:'), response.data);
      }
      console.log(c('gray', hr('·', 56)));
    } catch (error) {
      stopSpin();
      console.log(c('red', 'Error:'), error.message);
      console.log(c('dim', 'Tip: Is the OmegA brain server running?'));
    }
  },
  
  async status() {
    console.log(c('cyan', '\nSystem Status\n'));
    
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
    console.log(c('cyan', '\nAvailable Agents\n'));
    
    const agents = [
      { id: 'gemini', name: 'Gemini', desc: 'Planning & Strategy', status: '●' },
      { id: 'claude', name: 'Claude', desc: 'Deep Reasoning', status: '●' },
      { id: 'codex', name: 'Codex', desc: 'Code Execution', status: '●' },
      { id: 'grok', name: 'Grok', desc: 'Realtime Search', status: '●' }
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
      console.log(c('cyan', '\nMission Commands\n'));
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
            console.log(c('cyan', '\nMissions\n'));
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
    console.log(c('cyan', '\nConfiguration\n'));
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
    console.log(c('dim', 'Type a message and press Enter. /help for commands. "exit" to quit.'));
    console.log(c('dim', modeStrip()));
    console.log(c('dim', sysLine()) + '\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const prompt = () => {
      rl.question(promptLabel(), async (input) => {
        const trimmed = input.trim();
        
        if (trimmed === 'exit' || trimmed === 'quit') {
          console.log(c('dim', '\nGoodbye.'));
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
          } else if (cmd === 'clear') {
            process.stdout.write('\x1b[2J\x1b[H');
            console.log(banner);
            console.log(c('dim', sysLine()) + '\n');
          } else if (cmd === 'help') {
            commands.help();
          } else {
            console.log(c('yellow', `Unknown command: ${cmd}`));
            console.log(c('dim', 'Available: /status, /agents, /mission, /config, /help, /clear'));
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
${c('cyan', 'OmegA CLI')} - local brain interface

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
  OMEGA_USE_TOOLS   Tool mode (1/0)

${c('bright', 'Interactive shortcuts:')}
  /help   /status   /agents   /mission   /config   /clear
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
