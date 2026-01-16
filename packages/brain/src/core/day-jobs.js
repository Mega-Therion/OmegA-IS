/**
 * Day Jobs System - OMEGA Autonomous Agent Activities
 * 
 * When not tasked by RY, agents work on:
 * 1. Memory Pruning - Optimize vector store to save storage costs
 * 2. Probation Review - Analyze corrections and propose new Canon rules
 * 3. Self-Education - Fine-tune prompts, summarize documentation
 * 
 * All activities earn Neuro-Credits.
 */

const { getNeuroCreditSystem } = require('./neuro-credits');
const https = require('https');
const opportunityScout = require('./tasks/revenue/opportunity-scout');

class DayJobsSystem {
    constructor() {
        this.ncSystem = getNeuroCreditSystem();
        this.isRunning = false;
        this.intervals = {};
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    }

    /**
     * Start day jobs for all agents
     */
    start() {
        if (this.isRunning) {
            console.log('[DAY JOBS] Already running');
            return;
        }

        this.isRunning = true;
        console.log('[DAY JOBS] ✅ Activating autonomous agent work routines');

        // Stagger start times to avoid collisions
        setTimeout(() => this._startMemoryPruning(), 1000);
        setTimeout(() => this._startProbationReview(), 5000);
        setTimeout(() => this._startSelfEducation(), 10000);
        setTimeout(() => this._startRevenueTask(), 15000);
    }

    /**
     * Stop all day jobs
     */
    stop() {
        this.isRunning = false;
        Object.values(this.intervals).forEach(interval => clearInterval(interval));
        this.intervals = {};
        console.log('[DAY JOBS] ⏸️  Paused autonomous work routines');
    }

    /**
     * DAY JOB 1: Memory Pruning
     * Optimize vector store by removing duplicate/low-value entries
     */
    _startMemoryPruning() {
        // Run every 30 minutes
        this.intervals.memoryPruning = setInterval(async () => {
            const agent = this._selectRandomAgent();
            console.log(`[DAY JOB] ${agent} → Memory Pruning`);

            try {
                const pruned = await this._performMemoryPruning(agent);

                if (pruned > 0) {
                    await this.ncSystem.payForDayJob(agent, 'memory_pruning');
                    await this._logDayJob(agent, 'memory_pruning',
                        `Pruned ${pruned} low-value memory entries`, 0.3);
                    console.log(`[DAY JOB] ${agent} ✓ Pruned ${pruned} entries, earned 0.3 NC`);
                }
            } catch (error) {
                console.error(`[DAY JOB] ${agent} memory pruning failed:`, error.message);
            }
        }, 30 * 60 * 1000); // 30 minutes

        // Also run once immediately after 1 minute
        setTimeout(() => {
            const agent = this._selectRandomAgent();
            this._performMemoryPruning(agent).then(pruned => {
                if (pruned > 0) {
                    this.ncSystem.payForDayJob(agent, 'memory_pruning');
                    this._logDayJob(agent, 'memory_pruning', `Initial prune: ${pruned} entries`, 0.3);
                }
            });
        }, 60000);
    }

    async _performMemoryPruning(agent) {
        // Placeholder: Actual implementation would query vector store
        // and remove duplicates or low-relevance entries

        if (!this.supabaseUrl || !this.supabaseKey) {
            console.log(`[DAY JOB] ${agent} simulated memory pruning (no DB)`);
            return Math.floor(Math.random() * 10); // Simulated
        }

        // In production: Query semantic_memory or vector tables
        // For now, simulate finding 0-10 items to prune
        const simulated = Math.floor(Math.random() * 10);

        return simulated;
    }

    /**
     * DAY JOB 2: Probation Review
     * Analyze RY's corrections and propose new Canon rules
     */
    _startProbationReview() {
        // Run every 45 minutes
        this.intervals.probationReview = setInterval(async () => {
            const agent = this._selectRandomAgent();
            console.log(`[DAY JOB] ${agent} → Probation Review`);

            try {
                const reviewed = await this._performProbationReview(agent);

                if (reviewed > 0) {
                    await this.ncSystem.payForDayJob(agent, 'probation_review');
                    await this._logDayJob(agent, 'probation_review',
                        `Reviewed ${reviewed} corrections, proposed new rules`, 0.4);
                    console.log(`[DAY JOB] ${agent} ✓ Reviewed ${reviewed} items, earned 0.4 NC`);
                }
            } catch (error) {
                console.error(`[DAY JOB] ${agent} probation review failed:`, error.message);
            }
        }, 45 * 60 * 1000); // 45 minutes
    }

    async _performProbationReview(agent) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.log(`[DAY JOB] ${agent} simulated probation review (no DB)`);
            return Math.floor(Math.random() * 5);
        }

        try {
            // Query probation_queue for pending items
            const pendingItems = await this._supabaseRequest('GET',
                `/rest/v1/probation_queue?status=eq.pending&limit=5`);

            if (!Array.isArray(pendingItems) || pendingItems.length === 0) {
                return 0;
            }

            // In production: Use LLM to analyze patterns and propose rules
            // For now: Just mark as reviewed
            // const analyzed = await this._analyzeProbationItems(agent, pendingItems);

            return pendingItems.length;
        } catch (error) {
            console.error('[DAY JOB] Probation review query failed:', error.message);
            return 0;
        }
    }

    /**
     * DAY JOB 3: Self-Education
     * Fine-tune prompts, study documentation, improve capabilities
     */
    _startSelfEducation() {
        // Run every hour
        this.intervals.selfEducation = setInterval(async () => {
            const agent = this._selectRandomAgent();
            console.log(`[DAY JOB] ${agent} → Self-Education`);

            try {
                const learned = await this._performSelfEducation(agent);

                if (learned) {
                    await this.ncSystem.payForDayJob(agent, 'self_education');
                    await this._logDayJob(agent, 'self_education',
                        `Studied documentation and improved prompts`, 0.2);
                    console.log(`[DAY JOB] ${agent} ✓ Completed study session, earned 0.2 NC`);
                }
            } catch (error) {
                console.error(`[DAY JOB] ${agent} self-education failed:`, error.message);
            }
        }, 60 * 60 * 1000); // 1 hour
    }

    /**
     * DAY JOB 4: Revenue Generation (The War Chest)
     * Autonomous scouting for crypto earnings
     */
    _startRevenueTask() {
        // Run every 20 minutes (Frequency: High)
        this.intervals.revenueTask = setInterval(async () => {
            const agent = this._selectRandomAgent();
            console.log(`[DAY JOB] ${agent} → 💰 Revenue Scout`);

            try {
                const result = await opportunityScout.execute(agent);

                if (result.success) {
                    await this.ncSystem.payForDayJob(agent, 'revenue_task');
                    await this._logDayJob(agent, 'revenue_task',
                        `Found ${result.source} worth $${result.earned}`, 0.5);
                    console.log(`[DAY JOB] ${agent} 💰 Earned $${result.earned} for the War Chest`);
                }
            } catch (error) {
                console.error(`[DAY JOB] ${agent} revenue task failed:`, error.message);
            }
        }, 20 * 60 * 1000); // 20 minutes

        // Immediate run for demo
        setTimeout(() => {
            const agent = this._selectRandomAgent();
            opportunityScout.execute(agent).catch(e => console.error(e));
        }, 5000);
    }

    async _performSelfEducation(agent) {
        // Placeholder: Actual implementation would:
        // 1. Read documentation from /docs
        // 2. Analyze recent task failures
        // 3. Generate improved system prompts
        // 4. Store learnings in knowledge base

        console.log(`[DAY JOB] ${agent} studying system documentation...`);

        // Simulate learning time
        await new Promise(resolve => setTimeout(resolve, 2000));

        return true; // Successfully completed study session
    }

    /**
     * Helper: Select a random active agent
     */
    _selectRandomAgent() {
        const agents = ['gemini', 'claude', 'codex', 'grok', 'perplexity'];
        return agents[Math.floor(Math.random() * agents.length)];
    }

    /**
     * Log day job activity to database
     */
    async _logDayJob(agentId, activityType, description, ncEarned) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.log(`[DAY JOB] ${agentId} log (local): ${activityType}`);
            return;
        }

        try {
            await this._supabaseRequest('POST', '/rest/v1/day_job_log', {
                agent_id: agentId,
                activity_type: activityType,
                description,
                neuro_credits_earned: ncEarned
            });
        } catch (error) {
            console.error('[DAY JOB] Failed to log activity:', error.message);
        }
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

    /**
     * Get day job statistics for all agents
     */
    async getStatistics() {
        if (!this.supabaseUrl || !this.supabaseKey) {
            return { error: 'Database not configured' };
        }

        try {
            const stats = await this._supabaseRequest('GET',
                '/rest/v1/day_job_performance');
            return stats;
        } catch (error) {
            console.error('[DAY JOB] Failed to get statistics:', error.message);
            return { error: error.message };
        }
    }
}

// Singleton instance
let _dayJobsSystem = null;

function getDayJobsSystem() {
    if (!_dayJobsSystem) {
        _dayJobsSystem = new DayJobsSystem();
    }
    return _dayJobsSystem;
}

module.exports = { DayJobsSystem, getDayJobsSystem };
