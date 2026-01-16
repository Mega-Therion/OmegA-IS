# Repository Guidelines

## Project Structure & Module Organization
This repository is a multi-project workspace.
- `gAIng-brAin/`: primary Node/Express service (`src/` with `routes/`, `services/`, `workers/`) plus `scripts/`, `supabase/`, and `public/`.
- `gAIng-brAin/frontend/`: Vite + React UI (`src/App.jsx`, `src/components/`).
- `gAIng-brAin/mobile/` and `gAIng-brAin/desktop/`: client apps.
- `Jarvis/` and `Jarvis-1/`: Next.js UIs (`src/app/`, `public/`).
- `CollectiveBrain_V1/`: Python prototype (`main.py`, `tests/`).
- Docs and references: `docs/`, `README.md`, `log.md`, `CLAUDE.md`, `GEMINI.md`.

## Build, Test, and Development Commands
Run commands from the subproject directory you are working in.
- `gAIng-brAin/`: `npm run start` (API), `npm run test` (smoke test), `npm run omega:win` (Windows bootstrap), `npm run frontend` (launch Vite UI).
- `gAIng-brAin/frontend/`: `npm run dev`, `npm run build`, `npm run lint`.
- `Jarvis/` or `Jarvis-1/`: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- `CollectiveBrain_V1/`: `pip install -r requirements.txt`, `pytest -v`.

## Coding Style & Naming Conventions
- Indentation: 2 spaces for JS/TS/JSON; 4 spaces for Python.
- Naming: `camelCase` variables, `PascalCase` React components, `snake_case` Python, `kebab-case` docs/scripts.
- Linting: use `npm run lint` where available (Next.js or Vite frontend).

## Testing Guidelines
- `gAIng-brAin/` uses `scripts/smoke-test.js` via `npm run test`.
- `CollectiveBrain_V1/` uses pytest; name tests `test_*.py` under `tests/`.
- No global coverage gate is defined; add tests for new behavior.

## Commit & Pull Request Guidelines
- History is minimal; follow concise, imperative, sentence-case subjects (e.g., `Initialize repo guidelines and scripts`).
- Follow `gAIng-brAin/CONTRIBUTING.md`: create an Issue first, branch from `main` (`feature/...` or `fix/...`), link PRs with `Closes #123`, and do not self-merge.
- PRs should include a clear summary, tests run, and screenshots for UI changes.

## Security & Configuration Tips
- Keep secrets in `.env` files; update `.env.example` when adding variables.
- Supabase and MCP configuration live under `gAIng-brAin/supabase/` and `gAIng-brAin/mcp/`.
