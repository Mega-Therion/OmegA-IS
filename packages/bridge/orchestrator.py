"""Orchestrator Module - CollectiveBrain Multi-Agent System

Decomposes objectives into 3-5 distinct sub-goals and coordinates worker execution.
Follows the Orchestrator-Worker pattern as defined in the Shared Constitution.
"""

import uuid
from typing import Dict, List, Any
from datetime import datetime, timezone

# Try to import LLM client for intelligent decomposition
try:
    from llm_client import decompose_with_llm
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False


class Orchestrator:
    """Main orchestrator that decomposes objectives and manages task distribution."""
    
    def __init__(self):
        self.active_tasks: Dict[str, Dict] = {}
        self.completed_tasks: List[str] = []
    
    def decompose_objective(self, objective: str, max_goals: int = 5) -> Dict[str, Any]:
        """
        Decompose an objective into 3-5 distinct sub-goals.
        
        Args:
            objective: The high-level objective to decompose
            max_goals: Maximum number of sub-goals (default: 5)
        
        Returns:
            Dictionary containing task_id and list of sub_goals
        """
        task_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Use LLM for intelligent decomposition if available
        if LLM_AVAILABLE:
            sub_goals = decompose_with_llm(objective, max_goals)
        else:
            # Fallback to template-based decomposition
            sub_goals = [
                f"Research requirements for: {objective}",
                f"Design architecture for: {objective}",
                f"Create implementation plan for: {objective}",
                f"Implement and test: {objective}",
                f"Document and deploy: {objective}"
            ][:max_goals]
        
        task_data = {
            "task_id": task_id,
            "objective": objective,
            "sub_goals": sub_goals,
            "status": "created",
            "created_at": timestamp,
            "worker_assignments": {}
        }
        
        self.active_tasks[task_id] = task_data
        return task_data
    
    def assign_to_worker(self, task_id: str, sub_goal_index: int, worker_role: str) -> Dict[str, Any]:
        """
        Assign a specific sub-goal to a worker agent.
        
        Args:
            task_id: Unique task identifier
            sub_goal_index: Index of the sub-goal to assign
            worker_role: Role/type of worker (e.g., 'Research', 'Finance')
        
        Returns:
            Assignment details
        """
        if task_id not in self.active_tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.active_tasks[task_id]
        sub_goal = task["sub_goals"][sub_goal_index]
        
        assignment_id = f"{task_id}_{sub_goal_index}"
        assignment = {
            "assignment_id": assignment_id,
            "task_id": task_id,
            "sub_goal": sub_goal,
            "worker_role": worker_role,
            "status": "assigned",
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }
        
        task["worker_assignments"][assignment_id] = assignment
        return assignment
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Retrieve current status of a task."""
        if task_id in self.active_tasks:
            return self.active_tasks[task_id]
        elif task_id in self.completed_tasks:
            return {"task_id": task_id, "status": "completed"}
        else:
            return {"task_id": task_id, "status": "not_found"}
    
    def mark_complete(self, task_id: str) -> bool:
        """Mark a task as complete and move to completed list."""
        if task_id in self.active_tasks:
            self.completed_tasks.append(task_id)
            del self.active_tasks[task_id]
            return True
        return False


if __name__ == "__main__":
    # Example usage
    orchestrator = Orchestrator()
    
    # Decompose an objective
    task = orchestrator.decompose_objective("Build vector search capability")
    print(f"Created task: {task['task_id']}")
    print(f"Sub-goals: {task['sub_goals']}")
    
    # Assign sub-goals to workers
    assignment = orchestrator.assign_to_worker(task['task_id'], 0, "Research")
    print(f"\nAssignment created: {assignment['assignment_id']}")
