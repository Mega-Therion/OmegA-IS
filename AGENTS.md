# Repository Guidelines

## Project Structure & Module Organization
This repository is an early-stage coordination hub for multi-agent work.
- `log.md`: shared coordination log ("The Block"); keep entries short and actionable.
- `.claude/agents/`: Claude agent configurations and personas.
- `public/captures/`: public-facing captures or artifacts.
- `uploads/`: intended upload staging area.
- Root docs: `CLAUDE.md`, `GEMINI.md`, and this guide.

## Build, Test, and Development Commands
`package.json` exists with placeholder scripts until tooling is added.
- `npm run dev`: placeholder; no dev server configured yet.
- `npm run build`: placeholder; no build step configured yet.
- `npm run lint`: placeholder; no linting configured yet.
- `npm test`: placeholder; update once tests exist.
- Keep any new scripts in a `scripts/` folder and prefer PowerShell-friendly commands.

## Coding Style & Naming Conventions
Follow repository docs and existing patterns until a formatter is added.
- Indentation: 2 spaces for JSON/JS and 2 spaces for Markdown lists.
- Filenames: lowercase with hyphens for new docs (e.g., `architecture-notes.md`).
- Agent configs: keep under `.claude/agents/` and use clear, role-based names.

## Testing Guidelines
No testing framework is configured yet.
- If you introduce tests, place them under `tests/` or alongside source files with a `.test.*` suffix (e.g., `agents.test.js`).
- Document the exact command to run tests once available.

## Commit & Pull Request Guidelines
Git is initialized but there is no commit history yet.
- Use concise, imperative commit messages (e.g., `Add log sync script`).
- PRs should explain the change, link relevant issues, and include screenshots when UI changes are involved.

## Agent-Specific Instructions
- When coordinating across agents, read `log.md` before acting and add a short bullet after significant actions.
- Keep shared terminology consistent with `CLAUDE.md`.
