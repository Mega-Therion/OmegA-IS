# 🚀 Project Omega - 5-Minute Quick Start

Get your sovereign AI system running in under 5 minutes!

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node -v

# If missing, install from https://nodejs.org
```

## Step 1: Setup (First Time Only)

```bash
# Clone or pull latest
git pull origin claude/project-omega-system-AFxrf

# Install backend dependencies
npm install

# Setup frontend
npm run omega:setup
```

## Step 2: Configure Environment

```bash
# Copy example
cp .env.example .env

# Edit with your credentials (REQUIRED)
nano .env
```

**Minimum required:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

**Optional (for LLM features):**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

## Step 3: Database Setup

1. Go to your Supabase project SQL editor
2. Run these files in order:
   - `supabase/members.sql`
   - `supabase/tasks.sql`
   - `supabase/agents.sql`
   - `supabase/messages.sql`
   - `supabase/memories.sql`
   - `supabase/rls.sql`

**OR** if you have Supabase CLI:
```bash
supabase db push
```

## Step 4: Launch! 🎉

```bash
# One command to start everything
npm run omega
```

**Alternative (manual):**
```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend
npm run frontend
```

## Step 5: Access

Open browser to:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:8080

## First Mission

1. Click "Missions" tab
2. Type: "Analyze the Project Omega architecture"
3. Select agent: "Claude"
4. Click "Deploy"
5. Watch it work! ✨

## Troubleshooting

### "Cannot connect to backend"
- Check backend is running on port 8080
- Verify `.env` has correct Supabase credentials

### "Frontend won't load"
```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### "No agents showing up"
- Run `supabase/agents.sql` in Supabase SQL editor
- Or insert manually:
```sql
INSERT INTO agents (id, name, status) VALUES
('claude', 'Claude', 'online'),
('gemini', 'Gemini', 'online');
```

### "Voice not working"
- Use Chrome or Edge (required for Web Speech API)
- Allow microphone permissions
- HTTPS or localhost only

## Next Steps

- **Read full docs:** `PROJECT_OMEGA_README.md`
- **Configure agents:** `src/config/agents.json` (create if needed)
- **Customize UI:** `frontend/tailwind.config.js`
- **Add more agents:** See agent setup guide

## Common Commands

```bash
npm start              # Backend only
npm run frontend       # Frontend only
npm run omega          # Both together
npm run health:db      # Check Supabase connection
npm run test           # Run smoke tests
npm run orchestrate    # Start task orchestrator
npm run worker:claude  # Start Claude agent worker
```

## Development Mode

For development with hot reload:

```bash
# Terminal 1 - Backend (restart on changes)
npm start

# Terminal 2 - Frontend (auto-reload)
cd frontend && npm run dev
```

Edit files in:
- **Frontend:** `frontend/src/`
- **Backend:** `src/routes/` or `src/services/`

## Production Deploy

```bash
# Build frontend
npm run frontend:build

# Serve with nginx/apache
# Static files in: frontend/dist/

# Or deploy to Vercel/Netlify
cd frontend && vercel deploy
```

## Support

- **Issues:** GitHub Issues
- **Docs:** `PROJECT_OMEGA_README.md`
- **Architecture:** `docs/architecture.md`
- **API:** See `/api` endpoints at http://localhost:8080

---

**You're now running a sovereign AI orchestration system!** 🎉

Start creating missions, chatting with agents, and monitoring your AI collective.
