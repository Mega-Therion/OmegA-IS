/**
 * Peace Pipe Protocol (PPP) - OMEGA Mutex Lock System
 * 
 * "Only one agent can hold the Pipe (write permission) at a time during Council."
 * 
 * Enforced by the FastAPI Bridge, implemented here for the unified Node.js core.
 * 
 * Features:
 * - Mutex lock acquisition/release
 * - Session management
 * - Turn-taking enforcement
 * - Council meeting coordination
 */

const https = require('https');
const { EventEmitter } = require('events');

const SessionStatus = {
    IDLE: 'idle',
    IN_SESSION: 'in_session',
    LOCKED: 'locked'
};

class PeacePipeProtocol extends EventEmitter {
    constructor() {
        super();
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        this.currentSession = null;
        this.currentHolder = null;
        this.waitQueue = [];
    }

    /**
     * Start a new Council session
     */
    async startSession(sessionId = null) {
        sessionId = sessionId || `council_${Date.now()}`;

        if (this.currentSession) {
            return {
                success: false,
                error: 'Session already in progress',
                current_session: this.currentSession
            };
        }

        try {
            if (this.supabaseUrl && this.supabaseKey) {
                await this._supabaseRequest('POST', '/rest/v1/peace_pipe_sessions', {
                    session_id: sessionId,
                    status: SessionStatus.IN_SESSION,
                    started_at: new Date().toISOString()
                });
            }

            this.currentSession = {
                id: sessionId,
                status: SessionStatus.IN_SESSION,
                started_at: new Date().toISOString(),
                participants: []
            };

            this.emit('session_started', this.currentSession);
            console.log(`[PPP] 🕊️  Council session started: ${sessionId}`);

            return {
                success: true,
                session_id: sessionId,
                status: SessionStatus.IN_SESSION
            };
        } catch (error) {
            console.error('[PPP] Failed to start session:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Request to hold the Pipe (acquire mutex lock)
     */
    async requestPipe(agentId) {
        if (!this.currentSession) {
            return {
                success: false,
                error: 'No active session. Start a Council session first.'
            };
        }

        if (this.currentHolder) {
            // Add to wait queue
            this.waitQueue.push(agentId);
            console.log(`[PPP] ${agentId} added to queue (current holder: ${this.currentHolder})`);

            return {
                success: false,
                waiting: true,
                current_holder: this.currentHolder,
                queue_position: this.waitQueue.length
            };
        }

        // Grant the Pipe
        this.currentHolder = agentId;

        if (!this.currentSession.participants.includes(agentId)) {
            this.currentSession.participants.push(agentId);
        }

        try {
            if (this.supabaseUrl && this.supabaseKey) {
                await this._supabaseRequest('PATCH',
                    `/rest/v1/peace_pipe_sessions?session_id=eq.${this.currentSession.id}`,
                    {
                        holder_agent_id: agentId,
                        status: SessionStatus.LOCKED
                    });
            }

            this.emit('pipe_acquired', { agent: agentId, session: this.currentSession.id });
            console.log(`[PPP] 🕊️  ${agentId} holds the Pipe`);

            return {
                success: true,
                holder: agentId,
                session_id: this.currentSession.id
            };
        } catch (error) {
            console.error('[PPP] Failed to grant Pipe:', error.message);
            this.currentHolder = null;
            return { success: false, error: error.message };
        }
    }

    /**
     * Release the Pipe (release mutex lock)
     */
    async releasePipe(agentId) {
        if (!this.currentSession) {
            return {
                success: false,
                error: 'No active session'
            };
        }

        if (this.currentHolder !== agentId) {
            return {
                success: false,
                error: `You don't hold the Pipe. Current holder: ${this.currentHolder || 'none'}`
            };
        }

        this.currentHolder = null;

        try {
            if (this.supabaseUrl && this.supabaseKey) {
                await this._supabaseRequest('PATCH',
                    `/rest/v1/peace_pipe_sessions?session_id=eq.${this.currentSession.id}`,
                    {
                        holder_agent_id: null,
                        status: SessionStatus.IN_SESSION
                    });
            }

            this.emit('pipe_released', { agent: agentId, session: this.currentSession.id });
            console.log(`[PPP] 🕊️  ${agentId} released the Pipe`);

            // Check wait queue
            if (this.waitQueue.length > 0) {
                const nextAgent = this.waitQueue.shift();
                console.log(`[PPP] 🕊️  Passing Pipe to ${nextAgent} (from queue)`);

                // Automatically grant to next in queue
                setTimeout(() => this.requestPipe(nextAgent), 100);
            }

            return {
                success: true,
                released_by: agentId,
                next_in_queue: this.waitQueue[0] || null
            };
        } catch (error) {
            console.error('[PPP] Failed to release Pipe:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * End the Council session
     */
    async endSession() {
        if (!this.currentSession) {
            return {
                success: false,
                error: 'No active session to end'
            };
        }

        const sessionId = this.currentSession.id;
        const participants = this.currentSession.participants;

        try {
            if (this.supabaseUrl && this.supabaseKey) {
                await this._supabaseRequest('PATCH',
                    `/rest/v1/peace_pipe_sessions?session_id=eq.${sessionId}`,
                    {
                        holder_agent_id: null,
                        status: SessionStatus.IDLE,
                        ended_at: new Date().toISOString()
                    });
            }

            this.emit('session_ended', { session_id: sessionId, participants });
            console.log(`[PPP] 🕊️  Council session ended: ${sessionId}`);

            this.currentSession = null;
            this.currentHolder = null;
            this.waitQueue = [];

            return {
                success: true,
                session_id: sessionId,
                participants,
                ended_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('[PPP] Failed to end session:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current session status
     */
    getStatus() {
        return {
            active_session: this.currentSession?.id || null,
            current_holder: this.currentHolder,
            wait_queue: this.waitQueue,
            participants: this.currentSession?.participants || []
        };
    }

    /**
     * Check if an agent can speak (holds the Pipe or no session active)
     */
    canSpeak(agentId) {
        if (!this.currentSession) {
            return true; // No session = free speech
        }

        return this.currentHolder === agentId;
    }

    /**
     * Enforce PPP on a message
     * Returns true if message is allowed, false if blocked
     */
    enforce(agentId, message) {
        if (!this.currentSession) {
            return { allowed: true, reason: 'No active Council session' };
        }

        if (this.currentHolder === agentId) {
            return { allowed: true, reason: 'Holds the Pipe' };
        }

        return {
            allowed: false,
            reason: `Cannot speak. ${this.currentHolder} holds the Pipe.`,
            current_holder: this.currentHolder,
            queue_position: this.waitQueue.indexOf(agentId) + 1 || null
        };
    }

    /**
     * Supabase request helper
     */
    async _supabaseRequest(method, path, body = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.supabaseUrl);

            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Prefer': 'return=representation'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(data ? JSON.parse(data) : null);
                    } catch (e) {
                        resolve(data);
                    }
                });
            });

            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }
}

// Singleton instance
let _pppInstance = null;

function getPeacePipeProtocol() {
    if (!_pppInstance) {
        _pppInstance = new PeacePipeProtocol();
    }
    return _pppInstance;
}

module.exports = {
    PeacePipeProtocol,
    getPeacePipeProtocol,
    SessionStatus
};
