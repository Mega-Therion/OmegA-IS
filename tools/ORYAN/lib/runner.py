import os
import subprocess
import sys
from typing import Optional

from . import db
from . import env


STATUS_PENDING = "pending"
STATUS_RUNNING = "running"
STATUS_COMPLETED = "completed"
STATUS_FAILED = "failed"


def _check_dependencies(conn, task_id: int) -> list[int]:
    deps = db.list_dependencies(conn, task_id)
    incomplete = []
    for dep_id in deps:
        dep = db.get_task(conn, dep_id)
        if not dep or dep["status"] != STATUS_COMPLETED:
            incomplete.append(dep_id)
    return incomplete


def run_task(
    task_id: int,
    db_path: Optional[str] = None,
    dry_run: bool = False,
    approve: bool = False,
) -> int:
    settings = env.validate_env()
    if db_path is None and settings.oryan_db_path is not None:
        db_path = str(settings.oryan_db_path)
    conn = db.connect(db_path)
    task = db.get_task(conn, task_id)
    if not task:
        print(f"Task {task_id} not found.")
        return 1

    if task["status"] != STATUS_PENDING:
        print(f"Task {task_id} is not pending (status: {task['status']}).")
        return 1

    incomplete = _check_dependencies(conn, task_id)
    if incomplete:
        print(f"Task {task_id} has incomplete dependencies: {', '.join(map(str, incomplete))}.")
        return 1

    agent = db.get_agent(conn, task["agent_name"])
    if not agent:
        print(f"Agent '{task['agent_name']}' not found.")
        return 1

    if not approve and not dry_run:
        if not sys.stdin.isatty():
            # Assumption: non-interactive executions initiated by the user imply approval.
            db.add_log(conn, task_id, "Auto-approved execution (non-interactive shell).")
        else:
            response = input("Approve agent execution? Type 'yes' to proceed: ").strip().lower()
            if response != "yes":
                print("Execution cancelled.")
                return 1

    prompt = task["prompt"]

    if dry_run:
        print("Dry run: no execution performed.")
        print(f"Agent: {task['agent_name']}")
        print(f"Script: {agent['script_path']}")
        print(f"Prompt: {prompt}")
        return 0

    db.update_task_status(conn, task_id, STATUS_RUNNING)
    db.add_log(conn, task_id, f"Running agent {task['agent_name']} via {agent['script_path']}")

    env = os.environ.copy()
    env["ORYAN_PROMPT"] = prompt
    env["ORYAN_TASK_ID"] = str(task_id)

    try:
        result = subprocess.run(
            [agent["script_path"], prompt],
            capture_output=True,
            text=True,
            env=env,
            check=False,
        )
    except FileNotFoundError:
        db.update_task_status(conn, task_id, STATUS_FAILED)
        db.update_task_result(conn, task_id, None, "Agent script not found")
        db.add_log(conn, task_id, "Agent script not found")
        print("Agent script not found.")
        return 1

    stdout = result.stdout.strip() if result.stdout else ""
    stderr = result.stderr.strip() if result.stderr else ""

    if stdout:
        db.add_log(conn, task_id, f"STDOUT:\n{stdout}")
    if stderr:
        db.add_log(conn, task_id, f"STDERR:\n{stderr}")

    if result.returncode == 0:
        db.update_task_status(conn, task_id, STATUS_COMPLETED)
        db.update_task_result(conn, task_id, stdout or None, None)
        print(stdout)
        return 0

    db.update_task_status(conn, task_id, STATUS_FAILED)
    db.update_task_result(conn, task_id, stdout or None, stderr or "Unknown error")
    print(stderr or "Agent failed.")
    return result.returncode or 1
