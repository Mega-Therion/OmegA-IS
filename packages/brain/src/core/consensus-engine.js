/**
 * DCBFT Consensus Engine - OMEGA Core
 * 
 * Decentralized Collective Byzantine Fault Tolerance protocol.
 * Ported from Python bridge/consensus_engine.py
 * 
 * Implements N >= 3f + 1 formula where:
 * - N = total number of agents
 * - f = maximum number of faulty/Byzantine agents
 * 
 * Requires super-majority (~66%) consensus for high-impact actions.
 */

const VoteType = {
    APPROVE: 'approve',
    REJECT: 'reject',
    ABSTAIN: 'abstain'
};

const ConsensusDecision = {
    REACHED: 'consensus_reached',
    FAILED: 'consensus_failed',
    INSUFFICIENT_VOTES: 'insufficient_votes',
    BYZANTINE_DETECTED: 'byzantine_detected'
};

class DCBFTEngine {
    /**
     * @param {number} maxFaultyAgents - Maximum number of faulty agents to tolerate
     */
    constructor(maxFaultyAgents = 1) {
        this.maxFaultyAgents = maxFaultyAgents;
        this.minRequiredAgents = this._calculateMinAgents();
        this.requiredAgents = this.minRequiredAgents; // Back-compat
        this.pendingDecisions = {};
        this.finalizedDecisions = {};
    }

    /**
     * Calculate minimum agents required per DCBFT formula: N >= 3f + 1
     */
    _calculateMinAgents() {
        return (3 * this.maxFaultyAgents) + 1;
    }

    /**
     * Calculate quorum (super-majority) requirement (~66%)
     */
    _calculateQuorum(totalAgents) {
        return Math.ceil(totalAgents * 2 / 3);
    }

    /**
     * Initiate a consensus vote for a high-impact decision
     */
    initiateVote(decisionId, description, requiredAgents) {
        if (requiredAgents.length < this.minRequiredAgents) {
            return {
                error: `Insufficient agents. Need at least ${this.minRequiredAgents}, got ${requiredAgents.length}`,
                status: 'failed',
                formula: `N >= 3f + 1 where f=${this.maxFaultyAgents}`
            };
        }

        const voteSession = {
            decision_id: decisionId,
            description,
            required_agents: requiredAgents,
            votes: {},
            quorum_required: this._calculateQuorum(requiredAgents.length),
            quorum: this._calculateQuorum(requiredAgents.length),
            status: 'pending',
            initiated_at: new Date().toISOString(),
            finalized_at: null
        };

        this.pendingDecisions[decisionId] = voteSession;
        return voteSession;
    }

    /**
     * Cast a vote for a pending decision
     */
    castVote(decisionId, agentId, vote, justification = null) {
        if (!this.pendingDecisions[decisionId]) {
            return { error: 'Decision not found or already finalized', status: 'failed' };
        }

        const session = this.pendingDecisions[decisionId];

        if (!session.required_agents.includes(agentId)) {
            return { error: 'Agent not authorized to vote on this decision', status: 'failed' };
        }

        if (session.votes[agentId]) {
            return { error: 'Agent has already voted', status: 'failed' };
        }

        session.votes[agentId] = {
            vote: typeof vote === 'string' ? vote : vote.value || vote,
            justification,
            timestamp: new Date().toISOString()
        };

        return {
            decision_id: decisionId,
            agent_id: agentId,
            vote_recorded: session.votes[agentId].vote,
            total_votes: Object.keys(session.votes).length,
            quorum_required: session.quorum_required,
            status: 'recorded'
        };
    }

    /**
     * Tally votes and determine if consensus has been reached
     */
    tallyVotes(decisionId) {
        if (!this.pendingDecisions[decisionId]) {
            if (this.finalizedDecisions[decisionId]) {
                return this.finalizedDecisions[decisionId];
            }
            return { error: 'Decision not found', status: 'failed' };
        }

        const session = this.pendingDecisions[decisionId];
        const votes = session.votes;
        const quorum = session.quorum_required;
        const voteCount = Object.keys(votes).length;

        if (voteCount < quorum) {
            return {
                decision_id: decisionId,
                decision: ConsensusDecision.INSUFFICIENT_VOTES,
                votes_cast: voteCount,
                quorum_required: quorum,
                message: `Need ${quorum - voteCount} more votes to reach quorum`
            };
        }

        // Count votes
        let approveCount = 0;
        let rejectCount = 0;
        let abstainCount = 0;

        Object.values(votes).forEach(v => {
            if (v.vote === VoteType.APPROVE) approveCount++;
            else if (v.vote === VoteType.REJECT) rejectCount++;
            else if (v.vote === VoteType.ABSTAIN) abstainCount++;
        });

        // Determine consensus
        let decision;
        let decisionLabel;

        if (approveCount >= quorum) {
            decision = ConsensusDecision.REACHED;
            decisionLabel = 'approved';
        } else {
            decision = ConsensusDecision.FAILED;
            decisionLabel = 'rejected';
        }

        const result = {
            decision_id: decisionId,
            decision: decisionLabel,
            consensus_decision: decision,
            vote_breakdown: {
                approve: approveCount,
                reject: rejectCount,
                abstain: abstainCount,
                total: voteCount
            },
            quorum_required: quorum,
            quorum_met: voteCount >= quorum,
            consensus_percentage: voteCount > 0 ? Math.round((approveCount / voteCount) * 100 * 100) / 100 : 0,
            finalized_at: new Date().toISOString()
        };

        // Finalize
        session.status = 'finalized';
        session.finalized_at = result.finalized_at;
        session.final_decision = result;
        this.finalizedDecisions[decisionId] = session;
        delete this.pendingDecisions[decisionId];

        return result;
    }

    /**
     * Get current status of a decision
     */
    getDecisionStatus(decisionId) {
        if (this.pendingDecisions[decisionId]) {
            return { ...this.pendingDecisions[decisionId], is_finalized: false };
        } else if (this.finalizedDecisions[decisionId]) {
            return { ...this.finalizedDecisions[decisionId], is_finalized: true };
        }
        return null;
    }

    /**
     * Legacy method for simple consensus verification
     */
    verifyConsensus(votes, fFaultyNodes) {
        const requiredNodes = (3 * fFaultyNodes) + 1;

        if (votes.length < requiredNodes) {
            return `Insufficient nodes for consensus. Need ${requiredNodes}, got ${votes.length}`;
        }

        const approveCount = votes.filter(v => v).length;
        const quorum = this._calculateQuorum(votes.length);

        return approveCount >= quorum ? 'Consensus Reached' : 'Consensus Failed';
    }
}

module.exports = { DCBFTEngine, VoteType, ConsensusDecision };
