# ONE FINAL STEP TO COMPLETE SETUP

## What I've Done Already ✅
- ✅ Installed Supabase CLI
- ✅ Updated your `.env` file with your new project
- ✅ Created all the sync scripts
- ✅ Created database schemas
- ✅ Everything is ready to go

## What You Need To Do (ONE STEP):

### 1. Get the Service Role Key

**Click this exact link:**
```
https://supabase.com/dashboard/project/sgvitxezqrjgjmduoool/settings/api
```

**Look at your screen. You'll see something like this:**
```
Project API keys
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name          Key                    [Button]
anon          sb_publishable_...     [Copy]
service_role  ••••••••••••••••••     [Reveal] ← CLICK THIS
```

**Click the [Reveal] button** next to "service_role"

**Copy the LONG text** that appears (starts with `eyJhbGci...`)

### 2. Paste It Into Your .env File

**Open this file:**
```
C:\Users\mega_\gAIng-Brain\gAIng-brAin\.env
```

**Find this line (line 9):**
```
SUPABASE_SERVICE_ROLE_KEY=PASTE_SERVICE_ROLE_KEY_HERE
```

**Replace `PASTE_SERVICE_ROLE_KEY_HERE` with the key you copied**

**Save the file**

### 3. Run This Command

```bash
cd C:\Users\mega_\gAIng-Brain\gAIng-brAin
node scripts/setup-storage-bucket.js && node scripts/sync-files-to-supabase.js
```

**DONE!** All your files will be synced to Supabase.

---

## Screenshot Guide

If you're still stuck, take a screenshot of this page:
```
https://supabase.com/dashboard/project/sgvitxezqrjgjmduoool/settings/api
```

And I can circle exactly where the service_role key is.
