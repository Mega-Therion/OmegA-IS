const fs = require('fs');
const path = require('path');
const os = require('os');
const dotenv = require('dotenv');

const ROOT_DIR = path.join(__dirname, '..');
const MCP_DIR = path.join(ROOT_DIR, 'mcp');
const SERVERS_FILE = path.join(MCP_DIR, 'servers.json');
const ENV_FILE = path.join(MCP_DIR, '.env');

// Platform specific paths
const APPDATA = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const CLAUDE_CONFIG_DIR = path.join(APPDATA, 'Claude');
const CLAUDE_CONFIG_FILE = path.join(CLAUDE_CONFIG_DIR, 'claude_desktop_config.json');

function main() {
    console.log('Starting MCP Setup...');

    // 1. Read .env using dotenv
    let env = {};
    if (fs.existsSync(ENV_FILE)) {
        console.log(`Loading environment from ${ENV_FILE}`);
        const result = dotenv.config({ path: ENV_FILE });
        if (result.error) {
            console.error('Error loading .env file:', result.error);
        } else {
            env = result.parsed;
        }
    } else {
        console.warn(`Warning: ${ENV_FILE} not found. Using empty environment.`);
    }

    // 2. Read servers.json
    if (!fs.existsSync(SERVERS_FILE)) {
        console.error(`Error: ${SERVERS_FILE} not found.`);
        process.exit(1);
    }
    const serversConfig = JSON.parse(fs.readFileSync(SERVERS_FILE, 'utf8'));
    console.log(`Found ${serversConfig.servers.length} servers in definition.`);

    // 3. Transform to Claude Config format
    const mcpServers = {};
    
    serversConfig.servers.forEach(server => {
        const serverConfig = {
            command: server.command,
            args: [...server.args],
            env: {}
        };

        // Resolve absolute path for "."
        serverConfig.args = serverConfig.args.map(arg => {
            if (arg === '.') return ROOT_DIR;
            return arg;
        });

        // Resolve environment variables
        if (server.env) {
            for (const [key, value] of Object.entries(server.env)) {
                if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
                    const envVar = value.slice(2, -1);
                    if (env[envVar]) {
                        serverConfig.env[key] = env[envVar];
                    } else {
                        console.warn(`Warning: Environment variable ${envVar} required for server '${server.name}' is missing in .env`);
                        serverConfig.env[key] = "PLACEHOLDER_MISSING_" + envVar;
                    }
                } else {
                    serverConfig.env[key] = value;
                }
            }
        }
        
        // Remove env object if empty
        if (Object.keys(serverConfig.env).length === 0) delete serverConfig.env;

        mcpServers[server.name] = serverConfig;
    });

    const claudeConfig = {
        mcpServers: mcpServers
    };

    // 4. Write Claude Config
    if (!fs.existsSync(CLAUDE_CONFIG_DIR)) {
        console.log(`Creating directory: ${CLAUDE_CONFIG_DIR}`);
        fs.mkdirSync(CLAUDE_CONFIG_DIR, { recursive: true });
    }

    console.log(`Writing configuration to ${CLAUDE_CONFIG_FILE}`);
    fs.writeFileSync(CLAUDE_CONFIG_FILE, JSON.stringify(claudeConfig, null, 2));

    console.log('\n✅ MCP Setup Complete!');
    console.log('Please restart Claude Desktop to apply changes.');
    
    if (env.GITHUB_TOKEN && env.GITHUB_TOKEN.includes('your_pat_here')) {
        console.warn('\n⚠️  ACTION REQUIRED: You need to set a real GITHUB_TOKEN in mcp/.env');
    }
}

main();
