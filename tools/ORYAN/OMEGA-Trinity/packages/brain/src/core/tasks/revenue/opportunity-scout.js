const axios = require('axios');
const { getRevenueGovernor } = require('../../revenue-governor');
require('dotenv').config();

class OpportunityScout {
    constructor() {
        this.governor = getRevenueGovernor();
        this.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
        this.perplexityUrl = 'https://api.perplexity.ai/chat/completions';
    }

    async execute(agentName) {
        console.log(`[Revenue] ${agentName} scouting for crypto opportunities...`);

        // Check for API key
        if (!this.perplexityApiKey) {
            console.warn('[Revenue] No Perplexity API Key found! Using simulation mode.');
            return this.simulateSearch(agentName);
        }

        try {
            // Real search using Perplexity/Sonar
            console.log(`[Revenue] Queries Perplexity (sonar) for active opportunities...`);
            const response = await axios.post(
                this.perplexityUrl,
                {
                    model: 'sonar',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert crypto alpha scout. 
                            Task: Find 3 REAL, currently active crypto earning opportunities (Airdrops, Faucets, Governance Votes).
                            Output: STRICT JSON format only. Return an array of objects with keys: "source", "value" (estimated USD number), "prob" (0.1 to 0.9 success probability), "description".
                            Do not output markdown code blocks, just the raw JSON string.`
                        },
                        {
                            role: 'user',
                            content: 'Find the best crypto earning opportunities available right now.'
                        }
                    ],
                    temperature: 0.2
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.perplexityApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            let content = response.data.choices[0].message.content;

            // Cleanup potential markdown formatting
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();

            let opportunities;
            try {
                opportunities = JSON.parse(content);
            } catch (e) {
                console.error('[Revenue] Failed to parse Perplexity JSON:', content);
                return this.simulateSearch(agentName); // Fallback
            }

            if (!Array.isArray(opportunities) || opportunities.length === 0) {
                console.log(`[Revenue] No opportunities found via Search.`);
                return this.simulateSearch(agentName);
            }

            // Pick the highest value opportunity
            const pick = opportunities.reduce((prev, current) => (prev.value > current.value) ? prev : current);

            console.log(`[Revenue] Identified Opportunity: ${pick.source} (~$${pick.value}) - ${pick.description}`);

            // Simulate the "work" (since we can't physically do it yet)
            // In the future, this would trigger a sub-agent to actually visit the URL and perform actions.
            const success = Math.random() < pick.prob;

            if (success) {
                this.governor.depositEarnings(
                    agentName,
                    pick.value,
                    pick.source,
                    pick.description || 'Autonomous Scout Discovery'
                );
                return { success: true, earned: pick.value, source: pick.source };
            } else {
                console.log(`[Revenue] ${agentName} attempted execution but failed (Prob: ${pick.prob}).`);
                return { success: false, earned: 0 };
            }

        } catch (error) {
            console.error('[Revenue] Scout Error:', error.message);
            if (error.response) console.error('Details:', error.response.data);
            return this.simulateSearch(agentName);
        }
    }

    simulateSearch(agentName) {
        // Fallback simulation (existing logic)
        const opportunities = [
            { source: 'Twitter Airdrop Hunt (Simulated)', value: 0.05, prob: 0.3 },
            { source: 'Faucet Claim (Testnet Simulated)', value: 0.01, prob: 0.8 },
            { source: 'Waitlist Signup (Simulated)', value: 0.10, prob: 0.1 },
            { source: 'Governance Vote (Simulated)', value: 0.02, prob: 0.5 }
        ];

        const pick = opportunities[Math.floor(Math.random() * opportunities.length)];
        const success = Math.random() < pick.prob;

        if (success) {
            this.governor.depositEarnings(
                agentName,
                pick.value,
                pick.source,
                'Simulated autonomous task completion'
            );
            return { success: true, earned: pick.value, source: pick.source };
        } else {
            console.log(`[Revenue] ${agentName} found nothing (Simulated).`);
            return { success: false, earned: 0 };
        }
    }
}

module.exports = new OpportunityScout();
