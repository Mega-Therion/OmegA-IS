# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**chat_history_viewer** is a full-stack TypeScript application for viewing and managing chat history with a modern dark-mode glassmorphism design. Built with React 19, Express, and Drizzle ORM, it features tRPC for type-safe APIs, OAuth authentication, and a notification system.

## Architecture

**Monorepo Structure:**
- `client/` - React 19 frontend with Vite
- `server/` - Express backend with tRPC API
- `shared/` - Shared types and constants
- `drizzle/` - Database schema and migrations

**Tech Stack:**
- Frontend: React 19, Vite, Tailwind CSS, Radix UI, tRPC, React Query
- Backend: Express, tRPC, Drizzle ORM, MySQL
- Auth: OAuth with custom Manus provider, JWT sessions
- State: React Hook Form, Zod validation

## Development Commands

```bash
npm run dev        # Start dev server (tsx watch + Vite HMR)
npm run build      # Build client (Vite) + server (esbuild)
npm start          # Run production build
npm run check      # TypeScript type checking
npm run format     # Format code with Prettier
npm run test       # Run Vitest tests
npm run db:push    # Generate and apply database migrations
```

## Database (Drizzle ORM)

**Configuration:** MySQL database defined in `drizzle/schema.ts`

**Tables:**
- `users` - OAuth users with role-based access control
- `notifications` - User notifications with types and read status

**Migrations:** Run `npm run db:push` to generate SQL and apply to database

**Required ENV:** `DATABASE_URL=mysql://user:pass@host:3306/db`

## API Architecture (tRPC)

**Router Structure:**
- `system.*` - Health checks, admin notifications
- `auth.*` - User authentication, logout
- `notification.*` - CRUD operations for notifications

**Authentication:**
- Cookie-based sessions (`app_session_id`) with JWT
- OAuth flow: `/api/oauth/callback?code=...&state=...`
- Middleware: `requireUser` (authenticated), `requireAdmin` (admin only)

**Context:** `server/_core/context.ts` extracts user from JWT session token

## Environment Variables

Required in `.env`:
```env
VITE_APP_ID=<app_id>              # OAuth app registration
JWT_SECRET=<secret>                # JWT signing secret
DATABASE_URL=mysql://...           # MySQL connection
OAUTH_SERVER_URL=<url>             # Manus OAuth server
OWNER_OPEN_ID=<openid>             # Admin user OAuth ID
NODE_ENV=development|production
PORT=3000                          # Optional, defaults to 3000
```

## Key Files

- `server/_core/index.ts` - Express app setup, port discovery
- `server/_core/context.ts` - tRPC context with user auth
- `server/_core/sdk.ts` - OAuth/JWT session management
- `server/_core/trpc.ts` - tRPC initialization, middleware
- `server/db.ts` - Database operations (users, notifications)
- `client/src/main.tsx` - Client bootstrap, tRPC setup
- `client/src/App.tsx` - Root component with routing
- `drizzle/schema.ts` - Database schema definition

## Important Patterns

**Path Aliases (tsconfig.json):**
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

**Error Handling:**
- `UNAUTHED_ERR_MSG` (10001) - Triggers login redirect
- `NOT_ADMIN_ERR_MSG` (10002) - Permission denied
- tRPC errors automatically handled by client

**Type Safety:**
- End-to-end types via tRPC
- Runtime validation with Zod
- Drizzle type inference from schema
- SuperJSON for Date/Map serialization

## Development Workflow

1. **Setup:**
   ```bash
   npm install
   # Configure .env with credentials
   npm run db:push
   ```

2. **Development:**
   ```bash
   npm run dev  # Opens http://localhost:3000
   ```

3. **Production:**
   ```bash
   npm run build
   npm start
   ```

## Testing

- **Vitest** configured for unit/integration tests
- Run tests: `npm run test`
- Test file example: `server/auth.logout.test.ts`

## Code Standards

- TypeScript strict mode enabled
- Format with Prettier: `npm run format`
- Type check: `npm run check`
- Prefer editing existing files over creating new ones
- Use tRPC procedures for all API endpoints
- Never commit secrets to `.env`
