#!/usr/bin/env python3
import argparse
import datetime as dt
import json
import os
import subprocess


def _run(cmd):
    return subprocess.run(cmd, check=False, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def redis_cmd(host, port, args):
    cmd = ["redis-cli", "-h", host, "-p", str(port)] + args
    return _run(cmd)


def list_agents(host, port):
    res = redis_cmd(host, port, ["SMEMBERS", "agents:active"])
    if res.returncode != 0:
        return []
    return [line.strip() for line in res.stdout.splitlines() if line.strip()]


def get_agent(host, port, name):
    res = redis_cmd(host, port, ["HGETALL", f"agent:{name}"])
    if res.returncode != 0:
        return {}
    parts = [line.strip() for line in res.stdout.splitlines() if line.strip()]
    it = iter(parts)
    data = {}
    for k, v in zip(it, it):
        data[k] = v
    return data


def is_pid_alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except Exception:
        return False


def cleanup_stale(host, port):
    agents = list_agents(host, port)
    removed = []
    for name in agents:
        info = get_agent(host, port, name)
        pid = info.get("pid")
        if not pid or not is_pid_alive(pid):
            redis_cmd(host, port, ["SREM", "agents:active", name])
            redis_cmd(host, port, ["HSET", f"agent:{name}", "status", "stopped", "last_ts", dt.datetime.now().isoformat()])
            removed.append(name)
    return removed


def tail_journal(unit, lines=120):
    if not unit:
        return "(journal missing)"
    res = _run(["journalctl", "-u", unit, "-n", str(lines), "--no-pager"])
    if res.returncode != 0:
        return f"(journal read error: {res.stderr.strip()})"
    out = res.stdout.strip()
    return out if out else "(journal empty)"


def tail_log(path, lines=120, fallback_unit=None):
    if not path or not os.path.exists(path):
        return tail_journal(fallback_unit, lines) if fallback_unit else "(log missing)"
    if os.path.getsize(path) == 0:
        return tail_journal(fallback_unit, lines) if fallback_unit else "(log empty)"
    res = _run(["tail", "-n", str(lines), path])
    if res.returncode != 0:
        return f"(log read error: {res.stderr.strip()})"
    out = res.stdout.strip()
    if not out and fallback_unit:
        return tail_journal(fallback_unit, lines)
    return out


def summarize(host, port, out_path):
    now = dt.datetime.now().isoformat(timespec="seconds")
    agents = list_agents(host, port)
    entries = []
    for name in agents:
        info = get_agent(host, port, name)
        entry = {
            "name": name,
            "pid": info.get("pid"),
            "cwd": info.get("cwd"),
            "log": info.get("log"),
            "status": info.get("status", "unknown"),
            "last_ts": info.get("last_ts")
        }
        entries.append(entry)

    lines = [f"# OMEGA Session Summary ({now})", ""]
    if not entries:
        lines.append("No active agents registered.")
    for entry in entries:
        lines.append(f"## {entry['name']}")
        lines.append(f"- PID: `{entry['pid']}`")
        lines.append(f"- Status: `{entry['status']}`")
        lines.append(f"- CWD: `{entry['cwd']}`")
        lines.append(f"- Log: `{entry['log']}`")
        lines.append(f"- Last update: `{entry['last_ts']}`")
        lines.append("")
        lines.append("Recent log tail:")
        lines.append("```")
        unit = f"omega-{entry['name']}.service" if entry.get("name") else None
        lines.append(tail_log(entry["log"], fallback_unit=unit))
        lines.append("```")
        lines.append("")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--redis-host", default="127.0.0.1")
    parser.add_argument("--redis-port", type=int, default=6379)
    parser.add_argument("--out", default="/var/lib/omega/last_summary.md")
    parser.add_argument("--cleanup-stale", action="store_true")
    args = parser.parse_args()

    if args.cleanup_stale:
        removed = cleanup_stale(args.redis_host, args.redis_port)
        print(json.dumps({"removed": removed}))
        return

    summarize(args.redis_host, args.redis_port, args.out)


if __name__ == "__main__":
    main()
