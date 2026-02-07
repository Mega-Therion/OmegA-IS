"""
OMEGA Multi-Agent Chat Orchestrator
Interactive CLI for coordinating Claude, Gemini, and Codex agents.

Inspired by ai-code-connect, adapted for the OMEGA collective.
"""
from __future__ import annotations

import os
import sys
import readline  # Enable command history and editing
from datetime import datetime
from pathlib import Path
from typing import Optional
import textwrap

from lib.session import SessionManager

# ANSI Colors
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"

    # Agents
    CLAUDE = "\033[38;5;208m"  # Orange
    GEMINI = "\033[38;5;39m"   # Blue
    CODEX = "\033[38;5;46m"    # Green

    # UI
    HEADER = "\033[38;5;141m"  # Purple
    SUCCESS = "\033[38;5;82m"  # Light green
    ERROR = "\033[38;5;196m"   # Red
    WARNING = "\033[38;5;220m" # Yellow
    INFO = "\033[38;5;250m"    # Gray
    PROMPT = "\033[38;5;117m"  # Light blue


AGENT_COLORS = {
    "claude": Colors.CLAUDE,
    "gemini": Colors.GEMINI,
    "codex": Colors.CODEX,
}

VERSION = "1.0.0"

BANNER = f"""
{Colors.HEADER}{Colors.BOLD}
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║     ██████╗ ███╗   ███╗███████╗ ██████╗  █████╗              ║
  ║    ██╔═══██╗████╗ ████║██╔════╝██╔════╝ ██╔══██╗             ║
  ║    ██║   ██║██╔████╔██║█████╗  ██║  ███╗███████║             ║
  ║    ██║   ██║██║╚██╔╝██║██╔══╝  ██║   ██║██╔══██║             ║
  ║    ╚██████╔╝██║ ╚═╝ ██║███████╗╚██████╔╝██║  ██║             ║
  ║     ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝             ║
  ║                                                               ║
  ║           Multi-Agent Orchestrator v{VERSION}                    ║
  ║        Claude • Gemini • Codex  —  United as One              ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
{Colors.RESET}
"""

HELP_TEXT = f"""
{Colors.HEADER}{Colors.BOLD}OMEGA Commands:{Colors.RESET}

  {Colors.BOLD}Navigation:{Colors.RESET}
    {Colors.PROMPT}/claude{Colors.RESET}              Switch to Claude agent
    {Colors.PROMPT}/gemini{Colors.RESET}              Switch to Gemini agent
    {Colors.PROMPT}/codex{Colors.RESET}               Switch to Codex agent
    {Colors.PROMPT}/switch <agent>{Colors.RESET}      Switch to specified agent

  {Colors.BOLD}Communication:{Colors.RESET}
    {Colors.PROMPT}/forward{Colors.RESET}             Forward last response to next agent
    {Colors.PROMPT}/forward <agent>{Colors.RESET}     Forward to specific agent
    {Colors.PROMPT}/f{Colors.RESET}                   Shorthand for /forward
    {Colors.PROMPT}/f <agent> <text>{Colors.RESET}    Forward with additional context

  {Colors.BOLD}Interactive Mode:{Colors.RESET}
    {Colors.PROMPT}/interactive{Colors.RESET}         Attach to current agent's CLI
    {Colors.PROMPT}/i{Colors.RESET}                   Shorthand for /interactive
    {Colors.PROMPT}/i <agent>{Colors.RESET}           Attach to specific agent's CLI
    {Colors.INFO}(Press Ctrl+C to detach from interactive mode){Colors.RESET}

  {Colors.BOLD}Session Management:{Colors.RESET}
    {Colors.PROMPT}/status{Colors.RESET}              Show status of all agents
    {Colors.PROMPT}/history{Colors.RESET}             Show conversation history
    {Colors.PROMPT}/history <n>{Colors.RESET}         Show last n messages
    {Colors.PROMPT}/clear{Colors.RESET}               Clear current agent's history
    {Colors.PROMPT}/clearall{Colors.RESET}            Clear all agents' history

  {Colors.BOLD}Utility:{Colors.RESET}
    {Colors.PROMPT}/help{Colors.RESET}                Show this help message
    {Colors.PROMPT}/workspace{Colors.RESET}           Show/change workspace directory
    {Colors.PROMPT}/workspace <path>{Colors.RESET}    Change workspace directory
    {Colors.PROMPT}/exit{Colors.RESET}                Exit OMEGA orchestrator
    {Colors.PROMPT}/quit{Colors.RESET}                Same as /exit
    {Colors.PROMPT}Ctrl+C{Colors.RESET}               Exit (or detach from interactive)

{Colors.DIM}Type any message without / to send it to the current agent.{Colors.RESET}
{Colors.DIM}The gAIng Creed: Trust, but verify. Automate, but log.{Colors.RESET}
"""


def get_agent_prompt(agent: str, status: str = "ready") -> str:
    """Generate the command prompt for an agent."""
    color = AGENT_COLORS.get(agent, Colors.INFO)
    status_icon = "●" if status == "running" else "○"
    return f"{color}{Colors.BOLD}[{agent.upper()}]{Colors.RESET} {Colors.DIM}{status_icon}{Colors.RESET} > "


def print_agent_response(agent: str, response: str) -> None:
    """Print a response from an agent with formatting."""
    color = AGENT_COLORS.get(agent, Colors.INFO)
    print(f"\n{color}{Colors.BOLD}[{agent.upper()} RESPONSE]{Colors.RESET}")
    print(f"{Colors.DIM}{'─' * 60}{Colors.RESET}")

    # Wrap long lines for readability
    wrapped = []
    for line in response.split('\n'):
        if len(line) > 80:
            wrapped.extend(textwrap.wrap(line, width=80))
        else:
            wrapped.append(line)

    print('\n'.join(wrapped))
    print(f"{Colors.DIM}{'─' * 60}{Colors.RESET}\n")


def print_status(manager: SessionManager) -> None:
    """Print status of all agents."""
    status = manager.get_status()

    print(f"\n{Colors.HEADER}{Colors.BOLD}OMEGA Status{Colors.RESET}")
    print(f"{Colors.DIM}{'─' * 40}{Colors.RESET}")
    print(f"  Workspace: {Colors.INFO}{status['workspace']}{Colors.RESET}")
    print(f"  Current:   {AGENT_COLORS[status['current_agent']]}{status['current_agent'].upper()}{Colors.RESET}")
    print()

    for name, agent_status in status['agents'].items():
        color = AGENT_COLORS.get(name, Colors.INFO)
        status_color = Colors.SUCCESS if agent_status['status'] == 'running' else Colors.DIM
        current = " ◄" if name == status['current_agent'] else ""

        print(f"  {color}{Colors.BOLD}{name.upper():8}{Colors.RESET} "
              f"[{status_color}{agent_status['status']:8}{Colors.RESET}] "
              f"messages: {agent_status['history_count']}"
              f"{Colors.WARNING}{current}{Colors.RESET}")

    print(f"{Colors.DIM}{'─' * 40}{Colors.RESET}\n")


def print_history(manager: SessionManager, limit: int = 10, agent: Optional[str] = None) -> None:
    """Print conversation history."""
    agent = agent or manager.current_agent
    history = manager.get_history(agent, limit)
    color = AGENT_COLORS.get(agent, Colors.INFO)

    print(f"\n{color}{Colors.BOLD}[{agent.upper()}] Conversation History (last {limit}){Colors.RESET}")
    print(f"{Colors.DIM}{'─' * 60}{Colors.RESET}")

    if not history:
        print(f"  {Colors.DIM}No messages yet.{Colors.RESET}")
    else:
        for i, msg in enumerate(history, 1):
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            timestamp = msg.get('timestamp', '')[:19]  # Trim to readable
            source = msg.get('source_agent', '')

            if role == 'user':
                role_color = Colors.PROMPT
                prefix = "USER" if not source else f"FWD/{source.upper()}"
            else:
                role_color = color
                prefix = agent.upper()

            # Truncate long messages
            preview = content[:150] + "..." if len(content) > 150 else content
            preview = preview.replace('\n', ' ')

            print(f"  {Colors.DIM}{timestamp}{Colors.RESET} "
                  f"{role_color}{Colors.BOLD}{prefix:12}{Colors.RESET} "
                  f"{preview}")

    print(f"{Colors.DIM}{'─' * 60}{Colors.RESET}\n")


def parse_forward_command(args: str, manager: SessionManager) -> tuple[str, str]:
    """
    Parse forward command arguments.
    Returns (target_agent, additional_context)
    """
    parts = args.strip().split(maxsplit=1)

    if not parts:
        # Cycle to next agent
        agents = list(manager.sessions.keys())
        current_idx = agents.index(manager.current_agent)
        next_idx = (current_idx + 1) % len(agents)
        return agents[next_idx], ""

    first_arg = parts[0].lower()

    if first_arg in manager.sessions:
        # First arg is an agent name
        context = parts[1] if len(parts) > 1 else ""
        return first_arg, context
    else:
        # First arg is context, cycle to next agent
        agents = list(manager.sessions.keys())
        current_idx = agents.index(manager.current_agent)
        next_idx = (current_idx + 1) % len(agents)
        return agents[next_idx], args


def run_chat_loop(workspace: Optional[Path] = None) -> int:
    """Run the main OMEGA chat loop."""
    manager = SessionManager(workspace or Path.cwd())

    # Try to restore previous session
    if manager.load_session_state():
        print(f"{Colors.INFO}[OMEGA] Restored previous session state.{Colors.RESET}")

    # Print banner
    print(BANNER)
    print(f"{Colors.INFO}Type {Colors.PROMPT}/help{Colors.INFO} for commands or just type a message to chat.{Colors.RESET}\n")

    try:
        while True:
            try:
                session = manager.get_current_session()
                prompt = get_agent_prompt(manager.current_agent, session.status)

                try:
                    user_input = input(prompt).strip()
                except EOFError:
                    break

                if not user_input:
                    continue

                # Handle commands
                if user_input.startswith('/'):
                    cmd_parts = user_input[1:].split(maxsplit=1)
                    cmd = cmd_parts[0].lower()
                    cmd_args = cmd_parts[1] if len(cmd_parts) > 1 else ""

                    # Exit commands
                    if cmd in ('exit', 'quit', 'q'):
                        print(f"\n{Colors.INFO}[OMEGA] Shutting down... Goodbye!{Colors.RESET}\n")
                        break

                    # Help
                    elif cmd == 'help':
                        print(HELP_TEXT)

                    # Switch agent
                    elif cmd in ('claude', 'gemini', 'codex'):
                        manager.switch_agent(cmd)
                        print(f"{Colors.SUCCESS}[OMEGA] Switched to {AGENT_COLORS[cmd]}{cmd.upper()}{Colors.RESET}")

                    elif cmd == 'switch':
                        if cmd_args.lower() in manager.sessions:
                            manager.switch_agent(cmd_args.lower())
                            print(f"{Colors.SUCCESS}[OMEGA] Switched to {AGENT_COLORS[cmd_args.lower()]}{cmd_args.upper()}{Colors.RESET}")
                        else:
                            print(f"{Colors.ERROR}[ERROR] Unknown agent: {cmd_args}{Colors.RESET}")

                    # Forward
                    elif cmd in ('forward', 'f'):
                        if not session.last_response:
                            print(f"{Colors.WARNING}[WARNING] No response to forward. Send a message first.{Colors.RESET}")
                            continue

                        target, context = parse_forward_command(cmd_args, manager)
                        source = manager.current_agent

                        print(f"{Colors.INFO}[OMEGA] Forwarding response from {source.upper()} to {target.upper()}...{Colors.RESET}")

                        response = manager.forward(target, context)
                        print_agent_response(target, response)

                    # Interactive mode
                    elif cmd in ('interactive', 'i'):
                        agent = cmd_args.lower() if cmd_args.lower() in manager.sessions else manager.current_agent
                        if cmd_args and cmd_args.lower() not in manager.sessions:
                            print(f"{Colors.ERROR}[ERROR] Unknown agent: {cmd_args}{Colors.RESET}")
                            continue
                        manager.launch_interactive(agent)

                    # Status
                    elif cmd == 'status':
                        print_status(manager)

                    # History
                    elif cmd == 'history':
                        try:
                            limit = int(cmd_args) if cmd_args else 10
                        except ValueError:
                            limit = 10
                        print_history(manager, limit)

                    # Clear
                    elif cmd == 'clear':
                        manager.clear_history()
                        print(f"{Colors.SUCCESS}[OMEGA] Cleared history for {manager.current_agent.upper()}{Colors.RESET}")

                    elif cmd == 'clearall':
                        for agent in manager.sessions:
                            manager.clear_history(agent)
                        print(f"{Colors.SUCCESS}[OMEGA] Cleared all conversation history{Colors.RESET}")

                    # Workspace
                    elif cmd == 'workspace':
                        if cmd_args:
                            new_path = Path(cmd_args).expanduser().resolve()
                            if new_path.exists() and new_path.is_dir():
                                manager.workspace_dir = new_path
                                print(f"{Colors.SUCCESS}[OMEGA] Workspace changed to: {new_path}{Colors.RESET}")
                            else:
                                print(f"{Colors.ERROR}[ERROR] Invalid directory: {cmd_args}{Colors.RESET}")
                        else:
                            print(f"{Colors.INFO}[OMEGA] Current workspace: {manager.workspace_dir}{Colors.RESET}")

                    # Unknown command
                    else:
                        print(f"{Colors.WARNING}[WARNING] Unknown command: /{cmd}{Colors.RESET}")
                        print(f"{Colors.INFO}Type /help for available commands.{Colors.RESET}")

                # Regular message - send to current agent
                else:
                    print(f"{Colors.INFO}[OMEGA] Sending to {manager.current_agent.upper()}...{Colors.RESET}")
                    response = manager.chat(user_input)
                    print_agent_response(manager.current_agent, response)

                # Save session state periodically
                manager.save_session_state()

            except KeyboardInterrupt:
                print(f"\n{Colors.INFO}[OMEGA] Use /exit to quit or press Ctrl+C again.{Colors.RESET}")
                continue

    except KeyboardInterrupt:
        print(f"\n{Colors.INFO}[OMEGA] Interrupted. Goodbye!{Colors.RESET}\n")

    finally:
        manager.cleanup()

    return 0


def main(workspace: Optional[str] = None) -> int:
    """Entry point for the OMEGA chat orchestrator."""
    workspace_path = Path(workspace).expanduser().resolve() if workspace else Path.cwd()

    if not workspace_path.exists():
        print(f"{Colors.ERROR}[ERROR] Workspace does not exist: {workspace_path}{Colors.RESET}")
        return 1

    return run_chat_loop(workspace_path)


if __name__ == "__main__":
    sys.exit(main())
