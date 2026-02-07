# OMEGAI SYSTEM SPECIFICATION (v0)

## 1. Component Architecture
The OMEGAI (Omniscient Multi-modal Emergent Generative Artificial Intelligence) system represents the "God Mode" operational layer of Project VIBRANIUM. It orchestrates autonomous agents to execute complex missions.

### Core Components
- **The Brain (Orchestrator):** `src/core/brain.js`. Manages the loop, dispatches tasks, and holds state.
- **The Blackboard:** `data/log.md`. The shared memory space for all agents.
- **The Workers:** Specialized sub-agents (Planner, Builder, Researcher, Critic, Synthesizer) defined by strict IO contracts.
- **The Stream:** `data/stream.json`. Real-time telemetry for the UI/Neural Link.

## 2. Message Schemas

### The Mission Object
All workers operate on a `Mission` object.
```json
{
  "id": "mission-uuid",
  "objective": "High-level goal string",
  "status": "PENDING|ACTIVE|BLOCKED|COMPLETE",
  "context": {
    "constraints": [],
    "resources": []
  },
  "steps": [
    {
      "id": 1,
      "agent": "builder",
      "instruction": "...",
      "status": "pending",
      "output": null
    }
  ],
  "decision_log": []
}
```

## 3. Workflow (The Loop)
1.  **Ingest:** User input -> Blackboard (`User: ...`).
2.  **Triage:** Brain parses input -> Creates `Mission` object.
3.  **Plan:** Planner Worker decomposes Mission into `steps`.
4.  **Execute:** Brain iterates `steps`:
    - Selects Worker based on `agent` field.
    - Passes context + instruction.
    - Worker executes -> returns structured Output.
    - Brain updates Blackboard.
5.  **Review:** Critic Worker evaluates Output against Objective.
6.  **Finalize:** Synthesizer formats final report.

## 4. Permissions
- **Read:** Global. All agents can read `log.md` and `docs/`.
- **Write:** Constrained.
    - `Planner`: Can modify `Mission.steps`.
    - `Builder`: Can write to `src/` and `test/`.
    - `Researcher`: Read-only web/file access.
    - `Critic`: Can reject outputs (change status to `FAILED`).

## 5. Propose vs Execute
**Rule:** No irreversible actions (delete, publish, payment) without explicit user `GO` signal if the confidence score is < 0.9.
- **PROPOSE:** Default state for high-risk actions.
- **EXECUTE:** Allowed for low-risk actions (read, write local temp files).
