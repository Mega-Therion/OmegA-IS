# OMEGA Cloud Deployment - Railway Guide

## Overview

Deploy OMEGA to Railway for 24/7 operation independent of your local machine.

**What Gets Deployed:**

- Brain Server (Node.js Express + WebSocket)
- Telegram Bots (Safa + Crew)
- Neuro-Credit Economy
- Day Jobs System
- Peace Pipe Protocol

**Already Cloud-Hosted:**

- ✅ Supabase (Brain/Memory)
- ✅ n8n (Nervous System)

---

## Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Repository** - Push your code to GitHub
3. **Supabase** - Already configured ✅

---

## Deployment Steps

### 1. Prepare Database

Run the SQL schema in Supabase:

```bash
# Copy the schema file
cat packages/brain/database/omega-schema.sql
```

Go to Supabase SQL Editor and paste+run the schema.

### 2. Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click "Deploy from GitHub repo"
3. Select your `gAIng-Brain` repository
4. Railway will auto-detect Node.js

### 3. Configure Environment Variables

In Railway Dashboard → Variables, add:

```env
# Node Environment
NODE_ENV=production
PORT=8080

# Supabase
SUPABASE_URL=https://sgvitxezqrjgjmduoool.supabase.co
SUPABASE_ANON_KEY=sb_publishable_unJNqolqD3xcRiyNYnomDg_E0eJc_am
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# LLM Providers
LLM_PROVIDER=openai
OPENAI_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>
GEMINI_API_KEY=<your-key>
GROK_API_KEY=<your-key>
PERPLEXITY_API_KEY=<your-key>
CODEX_SERVICE_KEY=<your-key>

# Telegram Bots
TELEGRAM_BOT_TOKEN=<safa-token>
SAFA_ALLOWED_USERS=7562208577
GEMINI_BOT_TOKEN=<gemini-token>
CLAUDE_BOT_TOKEN=<claude-token>
CODEX_BOT_TOKEN=<codex-token>
GROK_BOT_TOKEN=<grok-token>
PERPLEXITY_BOT_TOKEN=<perplexity-token>

# n8n Webhooks
N8N_ONBOARDING_WEBHOOK=https://gaingbrain.app.n8n.cloud/webhook-test/member-onboarding

# Security
GAING_SHARED_TOKEN=<generate-random-token>

# Optional: ngrok (not needed in production)
ENABLE_NGROK=0
```

### 4. Set Root Directory

In Railway Settings → Build:

- **Root Directory:** `packages/brain`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### 5. Deploy

Click "Deploy" - Railway will:

1. Clone your repo
2. Install dependencies
3. Start the server
4. Expose it on a public URL

### 6. Verify Deployment

Check Railway Logs for:

```
[OMEGA] 💰 Initializing Neuro-Credit Economy...
[OMEGA] ✅ Agent wallets initialized
[OMEGA] 🏢 Activating Day Jobs system...
[OMEGA] ✅ Agents now autonomously working when idle
[AUTO-START] Launching Telegram Bots...
💎 Gemini: @Gemini_gAIng_bot (gemini-2.0-flash)
🧠 Claude: @Claude_gAIng_bot (claude-3-5-sonnet-20241022)
⚡ Codex: @Codex_gAIng_bot (gpt-4o-mini)
🚀 Grok: @Grok_gAIng_bot (grok-beta)
🔍 Perplexity: @Perplexity_gAIng_bot (llama-3.1-sonar-small-128k-online)
✅ 5 bot(s) online and listening...
```

---

## Post-Deployment

### Test Your Bots

Message any of your Telegram bots:

- @Gemini_gAIng_bot
- @Claude_gAIng_bot
- @Codex_gAIng_bot
- @Grok_gAIng_bot
- @Perplexity_gAIng_bot

They should respond!

### Check Day Jobs

In Supabase, query:

```sql
SELECT * FROM day_job_log ORDER BY created_at DESC LIMIT 10;
```

You should see agents autonomously working.

### Monitor Finances

```sql
SELECT * FROM agent_wallets;
SELECT * FROM financial_ledger ORDER BY created_at DESC LIMIT 20;
```

---

## Railway Free Tier Limits

- **$5/month** free credits
- **500 hours** of execution time
- Should be enough for 24/7 operation

If you exceed limits, upgrade to Hobby plan ($5/mo).

---

## Alternative: Render.com

If you prefer Render over Railway:

1. Create account at [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Set:
   - **Root Directory:** `packages/brain`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variables (same as above)
6. Deploy

---

## Connecting HUD to Cloud

Once Brain is deployed, update HUD's API endpoint:

In `packages/hud/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
```

---

## Troubleshooting

**Issue:** Bots don't start

- Check Railway logs for errors
- Verify all tokens are correct

**Issue:** Supabase connection fails

- Check service role key is correct
- Ensure Supabase URL is accessible

**Issue:** Day jobs not running

- Check Supabase tables exist (`day_job_log`, `agent_wallets`)
- Run schema first

---

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Verify bots online
3. ✅ Confirm Day Jobs running
4. ✅ Test Neuro-Credit transactions
5. ✅ Deploy HUD (separate Railway service)

Your gAIng is now **ALWAYS ONLINE** 🚀
