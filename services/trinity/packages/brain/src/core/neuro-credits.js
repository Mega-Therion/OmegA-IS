/**
 * Neuro-Credit Economy System
 * 
 * "Earn to Evolve" - Agents have wallets, pay for compute, earn from tasks.
 * 
 * Features:
 * - Agent wallets with balance tracking
 * - Transaction logging (earn/spend)
 * - Bankruptcy protection
 * - Cost calculation for API calls
 */

const https = require('https');

// Transaction types
const TransactionType = {
    EARN: 'earn',
    SPEND: 'spend',
    GRANT: 'grant',
    FINE: 'fine'
};

// Cost structure (in Neuro-Credits)
const COSTS = {
    // LLM API calls
    llm_call_gpt4: 0.10,
    llm_call_gpt35: 0.05,
    llm_call_claude: 0.08,
    llm_call_gemini: 0.06,
    llm_call_grok: 0.07,
    llm_call_perplexity: 0.05,

    // Memory operations
    vector_search: 0.01,
    memory_write: 0.02,

    // System operations
    consensus_vote: 0.03,
    file_operation: 0.01
};

// Earnings structure
const EARNINGS = {
    task_completion_simple: 1.0,
    task_completion_medium: 2.5,
    task_completion_complex: 5.0,
    consensus_participation: 0.5,
    memory_pruning: 0.3,
    probation_review: 0.4,
    self_education: 0.2
};

class NeuroCreditSystem {
    constructor(supabaseUrl = null, supabaseKey = null) {
        this.supabaseUrl = supabaseUrl || process.env.SUPABASE_URL;
        this.supabaseKey = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        this.localCache = {}; // In-memory cache for balance
    }

    /**
     * Initialize an agent's wallet with starting balance
     */
    async initializeWallet(agentId, startingBalance = 10.0) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            console.warn('[NC] Supabase not configured, using local cache only');
            this.localCache[agentId] = startingBalance;
            return { agent_id: agentId, balance: startingBalance, local: true };
        }

        try {
            // Check if wallet exists
            const existing = await this._supabaseRequest('GET',
                `/rest/v1/agent_wallets?agent_id=eq.${agentId}`);

            if (Array.isArray(existing) && existing.length > 0) {
                return existing[0];
            }

            // Create new wallet
            const wallet = await this._supabaseRequest('POST', '/rest/v1/agent_wallets', {
                agent_id: agentId,
                balance: startingBalance,
                total_earned: 0,
                total_spent: 0,
                is_bankrupt: false
            });

            this.localCache[agentId] = startingBalance;
            return Array.isArray(wallet) ? wallet[0] : wallet;
        } catch (error) {
            console.error('[NC] Failed to initialize wallet:', error.message);
            this.localCache[agentId] = startingBalance;
            return { agent_id: agentId, balance: startingBalance, local: true };
        }
    }

    /**
     * Get agent's current balance
     */
    async getBalance(agentId) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            return this.localCache[agentId] || 0;
        }

        try {
            const wallet = await this._supabaseRequest('GET',
                `/rest/v1/agent_wallets?agent_id=eq.${agentId}`);

            if (Array.isArray(wallet) && wallet.length > 0) {
                this.localCache[agentId] = wallet[0].balance;
                return wallet[0].balance;
            }

            return 0;
        } catch (error) {
            console.error('[NC] Failed to get balance:', error.message);
            return this.localCache[agentId] || 0;
        }
    }

    /**
     * Record a transaction (earn or spend)
     */
    async recordTransaction(agentId, amount, type, description = '') {
        if (!this.supabaseUrl || !this.supabaseKey) {
            // Update local cache
            const current = this.localCache[agentId] || 0;
            this.localCache[agentId] = type === TransactionType.EARN || type === TransactionType.GRANT
                ? current + amount
                : current - amount;

            console.log(`[NC] ${agentId}: ${type} ${amount}NC (local) - ${description}`);
            return { success: true, local: true, new_balance: this.localCache[agentId] };
        }

        try {
            // Get current wallet
            const wallet = await this._supabaseRequest('GET',
                `/rest/v1/agent_wallets?agent_id=eq.${agentId}`);

            if (!Array.isArray(wallet) || wallet.length === 0) {
                await this.initializeWallet(agentId);
                return this.recordTransaction(agentId, amount, type, description);
            }

            const currentWallet = wallet[0];
            const isDebit = type === TransactionType.SPEND || type === TransactionType.FINE;
            const newBalance = isDebit
                ? currentWallet.balance - amount
                : currentWallet.balance + amount;

            // Check for bankruptcy
            if (newBalance < 0) {
                await this._supabaseRequest('PATCH',
                    `/rest/v1/agent_wallets?agent_id=eq.${agentId}`,
                    { is_bankrupt: true, balance: 0 });

                console.warn(`[NC] ${agentId} is BANKRUPT! Balance would be ${newBalance}`);
                return { success: false, bankrupt: true, balance: 0 };
            }

            // Update wallet
            const updates = {
                balance: newBalance,
                total_earned: isDebit ? currentWallet.total_earned : currentWallet.total_earned + amount,
                total_spent: isDebit ? currentWallet.total_spent + amount : currentWallet.total_spent,
                updated_at: new Date().toISOString()
            };

            await this._supabaseRequest('PATCH',
                `/rest/v1/agent_wallets?agent_id=eq.${agentId}`,
                updates);

            // Log transaction
            await this._supabaseRequest('POST', '/rest/v1/financial_ledger', {
                agent_id: agentId,
                amount,
                transaction_type: type,
                description,
                balance_after: newBalance
            });

            this.localCache[agentId] = newBalance;
            console.log(`[NC] ${agentId}: ${type} ${amount}NC → ${newBalance}NC - ${description}`);

            return { success: true, new_balance: newBalance, bankrupt: false };
        } catch (error) {
            console.error('[NC] Failed to record transaction:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Charge for an LLM API call
     */
    async chargeLLMCall(agentId, provider) {
        const costKey = `llm_call_${provider}`;
        const cost = COSTS[costKey] || COSTS.llm_call_gpt35;
        return this.recordTransaction(agentId, cost, TransactionType.SPEND,
            `LLM API call (${provider})`);
    }

    /**
     * Pay for task completion
     */
    async payForTask(agentId, complexity = 'simple') {
        const earningKey = `task_completion_${complexity}`;
        const earning = EARNINGS[earningKey] || EARNINGS.task_completion_simple;
        return this.recordTransaction(agentId, earning, TransactionType.EARN,
            `Task completion (${complexity})`);
    }

    /**
     * Pay for day job activities
     */
    async payForDayJob(agentId, activity) {
        const earning = EARNINGS[activity] || 0.1;
        return this.recordTransaction(agentId, earning, TransactionType.EARN,
            `Day job: ${activity}`);
    }

    /**
     * Check if agent can afford an operation
     */
    async canAfford(agentId, cost) {
        const balance = await this.getBalance(agentId);
        return balance >= cost;
    }

    /**
     * Get agent wallet stats
     */
    async getWalletStats(agentId) {
        if (!this.supabaseUrl || !this.supabaseKey) {
            return {
                agent_id: agentId,
                balance: this.localCache[agentId] || 0,
                local: true
            };
        }

        try {
            const wallet = await this._supabaseRequest('GET',
                `/rest/v1/agent_wallets?agent_id=eq.${agentId}`);

            if (Array.isArray(wallet) && wallet.length > 0) {
                return wallet[0];
            }

            return { agent_id: agentId, balance: 0, not_found: true };
        } catch (error) {
            console.error('[NC] Failed to get wallet stats:', error.message);
            return { agent_id: agentId, balance: this.localCache[agentId] || 0, error: true };
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
}

// Singleton instance
let _ncSystem = null;

function getNeuroCreditSystem() {
    if (!_ncSystem) {
        _ncSystem = new NeuroCreditSystem();
    }
    return _ncSystem;
}

module.exports = {
    NeuroCreditSystem,
    getNeuroCreditSystem,
    TransactionType,
    COSTS,
    EARNINGS
};
