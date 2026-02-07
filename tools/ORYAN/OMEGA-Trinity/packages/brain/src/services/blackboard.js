const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class Blackboard extends EventEmitter {
    constructor() {
        super();
        // Get the project root (two levels up from src/services)
        const projectRoot = path.resolve(__dirname, '..', '..');
        this.logPath = process.env.AGENTS_MD_PATH || path.resolve(projectRoot, 'log.md');
        this.streamPath = path.resolve(projectRoot, 'data', 'stream.json');
        this.lastSize = 0;
        this.isLocked = false;
        this.enabled = true; // Can be disabled if log.md is inaccessible
    }

    // Initialize the Blackboard
    init() {
        try {
            console.log(`[Blackboard] Watching: ${this.logPath}`);
            
            // Ensure parent directory exists
            const logDir = path.dirname(this.logPath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            if (!fs.existsSync(this.logPath)) {
                fs.writeFileSync(this.logPath, '# gAIng Brain Log\n\n## Command Queue\n');
            }
        
            // Initial Read
            const stats = fs.statSync(this.logPath);
            this.lastSize = stats.size;

            // Watch for updates
            fs.watchFile(this.logPath, { interval: 1000 }, (curr, prev) => {
                if (curr.mtime > prev.mtime) {
                    this.readNewContent();
                }
            });
        } catch (err) {
            console.warn(`[Blackboard] Unable to initialize log.md at ${this.logPath}. Blackboard disabled.`);
            console.warn(`[Blackboard] Error: ${err.message}`);
            this.enabled = false;
        }
    }

    // Read only new lines appended to the log
    readNewContent() {
        if (this.isLocked) return;
        this.isLocked = true;

        try {
            const stats = fs.statSync(this.logPath);
            const sizeDiff = stats.size - this.lastSize;
            
            if (sizeDiff <= 0) {
                this.lastSize = stats.size;
                this.isLocked = false;
                return;
            }

            const buffer = Buffer.alloc(sizeDiff);
            const fd = fs.openSync(this.logPath, 'r');
            fs.readSync(fd, buffer, 0, sizeDiff, this.lastSize);
            fs.closeSync(fd);

            const newText = buffer.toString('utf8');
            this.lastSize = stats.size;

            this.parseContent(newText);

        } catch (err) {
            console.error('[Blackboard] Read Error:', err);
        } finally {
            this.isLocked = false;
        }
    }

    // Parse text for Commands and Signals
    parseContent(text) {
        const lines = text.split('\n');
        lines.forEach(line => {
            const trimmed = line.trim();
            
            // Detect Command
            if (trimmed.startsWith('- cmd:')) {
                const command = trimmed.substring(6).trim();
                console.log(`[Blackboard] CMD Detected: ${command}`);
                this.emit('command', command);
            }
            
            // Detect Signal (e.g., "User: Hello")
            else if (trimmed.startsWith('User:')) {
                this.emit('user_msg', trimmed.substring(5).trim());
            }
        });
    }

    // Broadcast current thought/status to stream.json (The "Link" sees this)
    broadcast(status, thought) {
        const state = {
            timestamp: new Date().toISOString(),
            status: status || 'IDLE',
            thought: thought || '',
            active_agents: ['Gemini', 'Codex', 'Claude']
        };
        // Ensure data dir exists
        const dir = path.dirname(this.streamPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(this.streamPath, JSON.stringify(state, null, 2));
    }

    // Write to the permanent log
    async write(text) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const entry = `\n- ${timestamp} ${text}`;
        fs.appendFileSync(this.logPath, entry);
    }
}

module.exports = new Blackboard();
