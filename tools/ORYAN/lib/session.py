"""
Session management for persistent agent processes.
Handles spawning, attaching, detaching, and forwarding between agents.
"""
from __future__ import annotations

import os
import pty
import select
import signal
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Callable
import json


@dataclass
class AgentSession:
    """Represents a running agent session."""
    name: str
    process: Optional[subprocess.Popen] = None
    pid: Optional[int] = None
    session_id: Optional[str] = None
    conversation_history: list[dict] = field(default_factory=list)
    last_response: str = ""
    status: str = "stopped"  # stopped, running, attached
    output_buffer: str = ""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "pid": self.pid,
            "session_id": self.session_id,
            "status": self.status,
            "history_count": len(self.conversation_history),
            "last_response_preview": self.last_response[:100] + "..." if len(self.last_response) > 100 else self.last_response
        }


class SessionManager:
    """Manages multiple agent sessions for the OMEGA orchestrator."""

    AGENT_COMMANDS = {
        "claude": {
            "chat": ["claude", "-p"],
            "resume": ["claude", "--resume"],
            "interactive": ["claude"],
        },
        "gemini": {
            "chat": ["gemini", "-p"],
            "resume": ["gemini", "--resume"],
            "interactive": ["gemini"],
        },
        "codex": {
            "chat": ["codex", "-p"],
            "resume": ["codex", "--resume"],
            "interactive": ["codex"],
        },
    }

    def __init__(self, workspace_dir: Optional[Path] = None):
        self.workspace_dir = workspace_dir or Path.cwd()
        self.sessions: dict[str, AgentSession] = {
            name: AgentSession(name=name)
            for name in self.AGENT_COMMANDS.keys()
        }
        self.current_agent = "claude"
        self.session_file = Path(tempfile.gettempdir()) / f"omega_sessions_{os.getpid()}.json"
        self._context_prefix_template = """
[FORWARDED FROM {source_agent}]
The {source_agent} agent sent you the following response.
Please review and provide your thoughts or suggestions.

--- BEGIN {source_agent} RESPONSE ---
{message}
--- END {source_agent} RESPONSE ---
"""

    def get_session(self, agent: str) -> AgentSession:
        """Get session for specified agent."""
        if agent not in self.sessions:
            raise ValueError(f"Unknown agent: {agent}")
        return self.sessions[agent]

    def get_current_session(self) -> AgentSession:
        """Get the currently active session."""
        return self.sessions[self.current_agent]

    def switch_agent(self, agent: str) -> AgentSession:
        """Switch to a different agent."""
        if agent not in self.sessions:
            raise ValueError(f"Unknown agent: {agent}. Available: {list(self.sessions.keys())}")
        self.current_agent = agent
        return self.sessions[agent]

    def _build_prompt_with_context(self, message: str, source_agent: Optional[str] = None) -> str:
        """Build prompt with optional context from another agent."""
        if source_agent:
            return self._context_prefix_template.format(
                source_agent=source_agent.upper(),
                message=message
            )
        return message

    def chat(self, message: str, agent: Optional[str] = None,
             source_agent: Optional[str] = None, additional_context: str = "") -> str:
        """
        Send a message to an agent and get response.
        Uses non-interactive mode for quick responses.
        """
        agent = agent or self.current_agent
        session = self.sessions[agent]

        # Build the full prompt
        full_prompt = self._build_prompt_with_context(message, source_agent)
        if additional_context:
            full_prompt += f"\n\nAdditional context from user: {additional_context}"

        # Record the message in history
        session.conversation_history.append({
            "role": "user",
            "content": full_prompt,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source_agent": source_agent
        })

        # Get the command for this agent
        cmd = self.AGENT_COMMANDS[agent]["chat"].copy()
        cmd.append(full_prompt)

        try:
            session.status = "running"
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
                cwd=str(self.workspace_dir)
            )

            response = result.stdout.strip()
            if result.returncode != 0 and result.stderr:
                response = f"[ERROR] {result.stderr.strip()}"

            session.last_response = response
            session.conversation_history.append({
                "role": "assistant",
                "agent": agent,
                "content": response,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            session.status = "stopped"

            return response

        except subprocess.TimeoutExpired:
            session.status = "stopped"
            return "[TIMEOUT] Agent took too long to respond"
        except FileNotFoundError:
            session.status = "stopped"
            return f"[ERROR] {agent} CLI not found. Make sure it's installed and in PATH."
        except Exception as e:
            session.status = "stopped"
            return f"[ERROR] {str(e)}"

    def forward(self, target_agent: str, additional_context: str = "") -> str:
        """
        Forward the last response from current agent to another agent.
        Returns the target agent's response.
        """
        source_session = self.get_current_session()
        if not source_session.last_response:
            return "[ERROR] No response to forward. Send a message first."

        source_agent = self.current_agent
        message = source_session.last_response

        # Switch to target and send
        self.switch_agent(target_agent)
        return self.chat(message, target_agent, source_agent, additional_context)

    def get_status(self) -> dict:
        """Get status of all sessions."""
        return {
            "current_agent": self.current_agent,
            "workspace": str(self.workspace_dir),
            "agents": {
                name: session.to_dict()
                for name, session in self.sessions.items()
            }
        }

    def get_history(self, agent: Optional[str] = None, limit: int = 10) -> list[dict]:
        """Get conversation history for an agent."""
        agent = agent or self.current_agent
        session = self.sessions[agent]
        return session.conversation_history[-limit:]

    def clear_history(self, agent: Optional[str] = None) -> None:
        """Clear conversation history for an agent."""
        agent = agent or self.current_agent
        self.sessions[agent].conversation_history = []
        self.sessions[agent].last_response = ""

    def launch_interactive(self, agent: Optional[str] = None) -> int:
        """
        Launch an interactive session with an agent.
        This attaches to the agent's CLI directly.
        Returns the exit code.
        """
        agent = agent or self.current_agent
        session = self.sessions[agent]
        cmd = self.AGENT_COMMANDS[agent]["interactive"]

        print(f"\n[OMEGA] Launching interactive session with {agent.upper()}...")
        print(f"[OMEGA] Press Ctrl+] to detach and return to OMEGA\n")

        session.status = "attached"

        try:
            # Run interactively
            result = subprocess.run(
                cmd,
                cwd=str(self.workspace_dir)
            )
            session.status = "stopped"
            return result.returncode
        except KeyboardInterrupt:
            session.status = "stopped"
            print(f"\n[OMEGA] Detached from {agent.upper()}")
            return 0

    def save_session_state(self) -> None:
        """Save session state to file for recovery."""
        state = {
            "current_agent": self.current_agent,
            "workspace": str(self.workspace_dir),
            "sessions": {
                name: {
                    "history": session.conversation_history,
                    "last_response": session.last_response
                }
                for name, session in self.sessions.items()
            }
        }
        self.session_file.write_text(json.dumps(state, indent=2))

    def load_session_state(self) -> bool:
        """Load session state from file if exists."""
        if not self.session_file.exists():
            return False
        try:
            state = json.loads(self.session_file.read_text())
            self.current_agent = state.get("current_agent", "claude")
            for name, data in state.get("sessions", {}).items():
                if name in self.sessions:
                    self.sessions[name].conversation_history = data.get("history", [])
                    self.sessions[name].last_response = data.get("last_response", "")
            return True
        except Exception:
            return False

    def cleanup(self) -> None:
        """Cleanup session state file."""
        if self.session_file.exists():
            self.session_file.unlink()
