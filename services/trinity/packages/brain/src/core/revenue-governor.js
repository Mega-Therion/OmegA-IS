const fs = require('fs');
const path = require('path');
const TonWeb = require('tonweb');
require('dotenv').config();

// The Ledger File (Persistent Storage for Earnings)
const LEDGER_FILE = path.join(__dirname, '../../database/revenue-ledger.json');

// Ensure ledger exists
if (!fs.existsSync(LEDGER_FILE)) {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify({ balanced_usd: 0, transactions: [] }, null, 2));
}

class RevenueGovernor {
    constructor() {
        this.walletAddress = process.env.OMEGA_TREASURY_WALLET;
        this.ledger = this.loadLedger();

        // Initialize TonWeb (Standard Library for TON)
        // Using public endpoint. For production, add API key: new TonWeb.HttpProvider('...', {apiKey: '...'})
        this.tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
    }

    loadLedger() {
        try {
            return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
        } catch (e) {
            console.error('[Revenue] Failed to load ledger:', e);
            return { balanced_usd: 0, transactions: [] };
        }
    }

    saveLedger() {
        fs.writeFileSync(LEDGER_FILE, JSON.stringify(this.ledger, null, 2));
    }

    getTreasuryStatus() {
        return {
            wallet: this.walletAddress || 'NOT_CONFIGURED',
            balance: this.ledger.balanced_usd,
            transactions_count: this.ledger.transactions.length
        };
    }

    /**
     * Check real balance on TON Blockchain
     */
    async checkRealBalance() {
        if (!this.walletAddress) {
            console.warn('[Revenue] No Wallet Address configured.');
            return 0;
        }

        console.log(`[Revenue] Checking TON Blockchain for wallet: ${this.walletAddress}...`);

        try {
            // Convert address to valid object (handles checking format)
            const address = new TonWeb.utils.Address(this.walletAddress);

            // Get balance in Nanotons
            const balanceNano = await this.tonweb.getBalance(address);

            if (balanceNano) {
                const balanceTon = TonWeb.utils.fromNano(balanceNano);
                console.log(`[Revenue] Real Balance: ${balanceTon} TON`);
                return balanceTon;
            } else {
                return 0;
            }

        } catch (error) {
            console.error('[Revenue] Blockchain check failed:', error.message);
            // Fallback to simulation/cache if network error
            return 0;
        }
    }

    depositEarnings(agentName, amountUSD, source, details) {
        if (!amountUSD || amountUSD <= 0) return;

        const tx = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            agent: agentName,
            amount: amountUSD,
            source: source,
            details: details,
            type: 'INCOME'
        };

        this.ledger.balanced_usd += amountUSD;
        this.ledger.transactions.push(tx);
        this.saveLedger();

        console.log(`[Revenue] 💰 ${agentName} earned $${amountUSD} from ${source}!`);
        return tx;
    }
}

// Singleton
const governor = new RevenueGovernor();

module.exports = {
    getRevenueGovernor: () => governor
};
