const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Load standardized env

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

    async checkRealBalance() {
        // TODO: Integrate TON API for real-time balance check
        // For now, return a placeholder or 0
        console.log(`[Revenue] Checking TON Blockchain for wallet: ${this.walletAddress}...`);
        return 0.0; // Placeholder
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
