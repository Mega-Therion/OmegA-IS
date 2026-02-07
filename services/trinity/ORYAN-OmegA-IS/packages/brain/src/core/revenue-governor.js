const fs = require('fs');
const path = require('path');
const TonWeb = require('tonweb');
const mnemonic = require('tonweb-mnemonic');
require('dotenv').config();

// The Ledger File (Persistent Storage for Earnings)
const LEDGER_FILE = path.join(__dirname, '../../database/revenue-ledger.json');

// Ensure ledger exists
if (!fs.existsSync(LEDGER_FILE)) {
    // Ensure directory exists
    const dbDir = path.dirname(LEDGER_FILE);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(LEDGER_FILE, JSON.stringify({ balanced_usd: 0, transactions: [] }, null, 2));
}

class RevenueGovernor {
    constructor() {
        this.walletAddress = process.env.OMEGA_TREASURY_WALLET;
        this.mnemonic = process.env.TON_MNEMONIC;
        this.ledger = this.loadLedger();

        // Initialize TonWeb (Standard Library for TON)
        this.tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
        
        this.wallet = null;
        this.keyPair = null;
        
        if (this.mnemonic) {
            this.initWallet();
        }
    }

    async initWallet() {
        try {
            const words = this.mnemonic.split(' ');
            if (words.length !== 24) {
                console.error('[Revenue] Invalid mnemonic length. Expected 24 words.');
                return;
            }

            this.keyPair = await mnemonic.mnemonicToKeyPair(words);
            const WalletClass = this.tonweb.wallet.all['v4R2'];
            this.wallet = new WalletClass(this.tonweb.provider, {
                publicKey: this.keyPair.publicKey,
                wc: 0
            });

            const address = await this.wallet.getAddress();
            const addressString = address.toString(true, true, true);
            
            if (this.walletAddress && this.walletAddress !== addressString) {
                console.warn(`[Revenue] Configured address ${this.walletAddress} does not match mnemonic address ${addressString}`);
            }
            
            this.walletAddress = addressString;
            console.log(`[Revenue] 🏦 Wallet initialized: ${this.walletAddress}`);
        } catch (e) {
            console.error('[Revenue] Failed to initialize wallet from mnemonic:', e.message);
        }
    }

    /**
     * Execute a real transfer on TON (e.g. to move funds to your main wallet)
     */
    async transfer(toAddress, amountTon, comment = '') {
        if (!this.wallet || !this.keyPair) {
            throw new Error('Wallet not initialized with mnemonic');
        }

        console.log(`[Revenue] 💸 Initiating transfer of ${amountTon} TON to ${toAddress}...`);

        try {
            const seqno = await this.wallet.methods.seqno().call() || 0;
            const transfer = this.wallet.methods.transfer({
                secretKey: this.keyPair.secretKey,
                toAddress: toAddress,
                amount: TonWeb.utils.toNano(amountTon.toString()),
                seqno: seqno,
                payload: comment,
                sendMode: 3,
            });

            const result = await transfer.send();
            console.log('[Revenue] ✓ Transfer sent to network:', result);
            return result;
        } catch (e) {
            console.error('[Revenue] Transfer failed:', e.message);
            throw e;
        }
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
