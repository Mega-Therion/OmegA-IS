# Run This SQL in Supabase Dashboard

The file sync encountered a schema issue. We need to run the SQL manually first.

## Step 1: Open SQL Editor

Go to: https://supabase.com/dashboard/project/sgvitxezqrjgjmduoool/sql/new

## Step 2: Copy & Paste This SQL

Copy the ENTIRE contents of this file:
```
C:\Users\mega_\gAIng-Brain\gAIng-brAin\supabase\files.sql
```

## Step 3: Run It

Click "Run" in the SQL Editor

## Step 4: Then Re-Run Sync

After the SQL succeeds, run:
```bash
cd C:\Users\mega_\gAIng-Brain\gAIng-brAin
node scripts/sync-files-to-supabase.js
```

---

## OR Use Supabase CLI

If you prefer command line:

```bash
cd C:\Users\mega_\gAIng-Brain\gAIng-brAin
supabase db push
```
