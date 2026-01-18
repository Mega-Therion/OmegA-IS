# Repository Guidelines

## Project Structure & Module Organization
- `client/`: Vite + React (Tailwind 4); entry at `src/main.tsx` and `App.tsx`; pages/components/hooks/contexts stay under `client/src`.
- `server/`: Express + tRPC; `_core/` bootstraps the app, auth, env, and Vite dev server; `routers/` holds API routers; `storage.ts` wraps S3; `index.ts` serves the built client in production.
- `shared/`: Constants and types shared by client and server.
- `drizzle/`: MySQL schema and migrations; driven by `drizzle.config.ts` and `DATABASE_URL`.
- `patches/`: pnpm patch for `wouter`; `attached_assets/` (when present) is exposed via the `@assets` alias.

## Build, Test, and Development Commands
- `pnpm install` restore dependencies (pnpm lock committed).
- `pnpm dev` starts `server/_core/index.ts` with Vite middleware in development.
- `pnpm build` outputs client assets to `dist/public` then bundles the server entry to `dist/index.js`; `pnpm start` serves that bundle.
- `pnpm check` runs TypeScript no-emit; `pnpm format` applies Prettier.
- `pnpm test` runs Vitest suites under `server/**/*.test.ts|spec.ts`.
- `pnpm db:push` generates and runs Drizzle migrations (requires `DATABASE_URL`; run from a clean tree).
- `pnpm omega` launches the Omega Trinity stack (portal + Jarvis + CollectiveBrain API + gAIng-brAin) from one command; see `OMEGA_STACK.md` for env requirements.
- Env: use the single root `.env` (copy from `.env.example`); per-app env templates were removed.

## Coding Style & Naming Conventions
- TypeScript + ESM; use path aliases `@`, `@shared`, and `@assets` for imports.
- Prettier enforces 2-space indent, semicolons, double quotes, 80-col width; format before committing.
- Components: PascalCase filenames; hooks start with `use`; prefer function components with hooks.
- Styling: Tailwind utilities in `index.css`; compose classes with `clsx`/`cva`; keep theme tokens in CSS variables rather than hard-coding colors.
- Server: keep routers in `server/routers` and shared helpers in `_core/`; inject env via `_core/env` instead of ad hoc reads.

## Testing Guidelines
- Vitest runs in a Node environment; focus on tRPC routers and utilities. Reuse context factories (see `server/auth.logout.test.ts`) instead of real services.
- Tests live under `server/` and are named `*.test.ts` or `*.spec.ts`; group `describe` blocks per route/use-case and assert payload plus side effects (cookies, headers).
- Mock network/DB calls to keep tests deterministic and fast; prefer lightweight fixtures.

## Commit & Pull Request Guidelines
- Match existing log style: concise summaries with scope (use `Checkpoint: ...` for larger batches or a short imperative for focused fixes).
- PRs should include a brief overview, tests run (`pnpm test`, `pnpm check`), DB migration notes, and any env var changes. Add UI screenshots/GIFs for client updates and link related issues or tickets.
