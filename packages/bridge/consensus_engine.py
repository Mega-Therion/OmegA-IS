"""Consensus Engine Module - CollectiveBrain Multi-Agent System

Implements the DCBFT (Decentralized Collective Byzantine Fault Tolerance) protocol.
Follows the Consensus-Based Security principle as defined in the Shared Constitution.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from enum import Enum
import math


class VoteType(Enum):
    """Types of votes in the consensus protocol."""
    APPROVE = "approve"
    REJECT = "reject"
    ABSTAIN = "abstain"


class ConsensusDecision(Enum):
    """Possible consensus outcomes."""
    REACHED = "consensus_reached"
    FAILED = "consensus_failed"
    INSUFFICIENT_VOTES = "insufficient_votes"
    BYZANTINE_DETECTED = "byzantine_detected"


class DCBFTEngine:
    """Decentralized Collective Byzantine Fault Tolerance consensus engine.
    
    Implements N >= 3f + 1 formula where:
    - N = total number of agents
    - f = maximum number of faulty/Byzantine agents
    
    Requires super-majority (~66%) consensus for high-impact actions.
    """
    
    def __init__(self, max_faulty_agents: int = 1):
        self.max_faulty_agents = max_faulty_agents
        self.min_required_agents = self._calculate_min_agents()
        # Back-compat for tests and older callers.
        self.required_agents = self.min_required_agents
        self.pending_decisions: Dict[str, Dict] = {}
        self.finalized_decisions: Dict[str, Dict] = {}
    
    def _calculate_min_agents(self) -> int:
        """Calculate minimum agents required per DCBFT formula: N >= 3f + 1."""
        return (3 * self.max_faulty_agents) + 1
    
    def _calculate_quorum(self, total_agents: int) -> int:
        """Calculate quorum (super-majority) requirement (~66%)."""
        return math.ceil(total_agents * 2 / 3)
    
    def initiate_vote(self, decision_id: str, description: str, required_agents: List[str]) -> Dict[str, Any]:
        """Initiate a consensus vote for a high-impact decision.
        
        Args:
            decision_id: Unique identifier for this decision
            description: Description of the decision requiring consensus
            required_agents: List of agent IDs required to vote
        
        Returns:
            Vote session details
        """
        if len(required_agents) < self.min_required_agents:
            return {
                "error": f"Insufficient agents. Need at least {self.min_required_agents}, got {len(required_agents)}",
                "status": "failed",
                "formula": f"N >= 3f + 1 where f={self.max_faulty_agents}"
            }
        
        vote_session = {
            "decision_id": decision_id,
            "description": description,
            "required_agents": required_agents,
            "votes": {},
            "quorum_required": self._calculate_quorum(len(required_agents)),
            # Back-compat for tests.
            "quorum": self._calculate_quorum(len(required_agents)),
            "status": "pending",
            "initiated_at": datetime.now(timezone.utc).isoformat(),
            "finalized_at": None
        }
        
        self.pending_decisions[decision_id] = vote_session
        return vote_session
    
    def cast_vote(self, decision_id: str, agent_id: str, vote: VoteType, justification: Optional[str] = None) -> Dict[str, Any]:
        """Cast a vote for a pending decision.
        
        Args:
            decision_id: ID of the decision to vote on
            agent_id: ID of the voting agent
            vote: Vote type (APPROVE, REJECT, ABSTAIN)
            justification: Optional reasoning for the vote
        
        Returns:
            Vote confirmation
        """
        if decision_id not in self.pending_decisions:
            return {"error": "Decision not found or already finalized", "status": "failed"}
        
        session = self.pending_decisions[decision_id]
        
        if agent_id not in session["required_agents"]:
            return {"error": "Agent not authorized to vote on this decision", "status": "failed"}
        
        if agent_id in session["votes"]:
            return {"error": "Agent has already voted", "status": "failed"}
        
        session["votes"][agent_id] = {
            "vote": vote.value,
            "justification": justification,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "decision_id": decision_id,
            "agent_id": agent_id,
            "vote_recorded": vote.value,
            "total_votes": len(session["votes"]),
            "quorum_required": session["quorum_required"],
            "status": "recorded"
        }
    
    def tally_votes(self, decision_id: str) -> Dict[str, Any]:
        """Tally votes and determine if consensus has been reached.
        
        Args:
            decision_id: ID of the decision to tally
        
        Returns:
            Consensus result
        """
        if decision_id not in self.pending_decisions:
            if decision_id in self.finalized_decisions:
                return self.finalized_decisions[decision_id]
            return {"error": "Decision not found", "status": "failed"}
        
        session = self.pending_decisions[decision_id]
        votes = session["votes"]
        quorum = session["quorum_required"]
        
        if len(votes) < quorum:
            return {
                "decision_id": decision_id,
                "decision": ConsensusDecision.INSUFFICIENT_VOTES.value,
                "votes_cast": len(votes),
                "quorum_required": quorum,
                "message": f"Need {quorum - len(votes)} more votes to reach quorum"
            }
        
        # Count votes
        approve_count = sum(1 for v in votes.values() if v["vote"] == VoteType.APPROVE.value)
        reject_count = sum(1 for v in votes.values() if v["vote"] == VoteType.REJECT.value)
        abstain_count = sum(1 for v in votes.values() if v["vote"] == VoteType.ABSTAIN.value)
        
        # Determine consensus
        if approve_count >= quorum:
            decision = ConsensusDecision.REACHED
            decision_label = "approved"
            finalized = True
        elif reject_count >= quorum:
            decision = ConsensusDecision.FAILED
            decision_label = "rejected"
            finalized = True
        else:
            decision = ConsensusDecision.FAILED
            decision_label = "rejected"
            finalized = True
        
        result = {
            "decision_id": decision_id,
            # Tests expect "approved"/"rejected".
            "decision": decision_label,
            "consensus_decision": decision.value,
            "vote_breakdown": {
                "approve": approve_count,
                "reject": reject_count,
                "abstain": abstain_count,
                "total": len(votes)
            },
            "quorum_required": quorum,
            "quorum_met": len(votes) >= quorum,
            "consensus_percentage": round((approve_count / len(votes)) * 100, 2) if votes else 0,
            "finalized_at": datetime.now(timezone.utc).isoformat()
        }
        
        if finalized:
            session["status"] = "finalized"
            session["finalized_at"] = result["finalized_at"]
            session["final_decision"] = result
            self.finalized_decisions[decision_id] = session
            del self.pending_decisions[decision_id]
        
        return result
    
    def get_decision_status(self, decision_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a decision."""
        if decision_id in self.pending_decisions:
            return {**self.pending_decisions[decision_id], "is_finalized": False}
        elif decision_id in self.finalized_decisions:
            return {**self.finalized_decisions[decision_id], "is_finalized": True}
        return None
    
    def verify_consensus(self, votes: List[bool], f_faulty_nodes: int) -> str:
        """Legacy method for simple consensus verification.
        
        Args:
            votes: List of boolean votes
            f_faulty_nodes: Number of potentially faulty nodes
        
        Returns:
            Consensus result message
        """
        required_nodes = (3 * f_faulty_nodes) + 1
        
        if len(votes) < required_nodes:
            return f"Insufficient nodes for consensus. Need {required_nodes}, got {len(votes)}"
        
        approve_count = sum(votes)
        quorum = self._calculate_quorum(len(votes))
        
        if approve_count >= quorum:
            return "Consensus Reached"
        else:
            return "Consensus Failed"


if __name__ == "__main__":
    # Example usage
    print("=== DCBFT Consensus Engine Example ===")
    
    # Initialize engine allowing for 1 faulty agent (requires 4 total agents)
    engine = DCBFTEngine(max_faulty_agents=1)
    print(f"\nMin required agents (N >= 3f+1): {engine.min_required_agents}")
    
    # Initiate a vote for a high-impact decision
    agents = ["agent_1", "agent_2", "agent_3", "agent_4", "agent_5"]
    vote_session = engine.initiate_vote(
        "decision_001",
        "Deploy updated vector search algorithm to production",
        agents
    )
    print(f"\nVote initiated: {vote_session['decision_id']}")
    print(f"Quorum required: {vote_session['quorum_required']} out of {len(agents)} agents")
    
    # Cast votes
    engine.cast_vote("decision_001", "agent_1", VoteType.APPROVE, "Tested successfully")
    engine.cast_vote("decision_001", "agent_2", VoteType.APPROVE, "Performance improvement verified")
    engine.cast_vote("decision_001", "agent_3", VoteType.APPROVE, "No issues detected")
    engine.cast_vote("decision_001", "agent_4", VoteType.REJECT, "More testing needed")
    
    # Tally votes
    result = engine.tally_votes("decision_001")
    print(f"\nConsensus Result: {result['decision']}")
    print(f"Vote Breakdown: {result['vote_breakdown']}")
    print(f"Consensus Percentage: {result['consensus_percentage']}%")
