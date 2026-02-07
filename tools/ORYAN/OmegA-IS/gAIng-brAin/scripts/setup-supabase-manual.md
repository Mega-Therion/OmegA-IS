# Supabase Database Setup Instructions

## Quick Setup via Web Dashboard

**Your Supabase Project:** https://app.supabase.com/project/sgvitxezqrjgjmduoool/sql/new

### Step-by-Step:

1. **Go to SQL Editor:**
   - Open: https://app.supabase.com/project/sgvitxezqrjgjmduoool/sql/new

2. **Run Each SQL File in Order:**

#### File 1: members.sql
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\members.sql
Paste in SQL Editor → Click "Run"
```

#### File 2: memories.sql
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\memories.sql
Paste in SQL Editor → Click "Run"
```

#### File 3: memory_sources.sql
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\memory_sources.sql
Paste in SQL Editor → Click "Run"
```

#### File 4: memory_revisions.sql
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\memory_revisions.sql
Paste in SQL Editor → Click "Run"
```

#### File 5: memory_votes.sql
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\memory_votes.sql
Paste in SQL Editor → Click "Run"
```

#### File 6: messages.sql
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\messages.sql
Paste in SQL Editor → Click "Run"
```

#### File 7: task_queue.sql
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\task_queue.sql
Paste in SQL Editor → Click "Run"
```

#### File 8: rls.sql (Row Level Security)
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\rls.sql
Paste in SQL Editor → Click "Run"
```

#### File 9: updated_at.sql (Triggers)
```bash
Copy content from: C:\Windows\gAIng-brAin\supabase\updated_at.sql
Paste in SQL Editor → Click "Run"
```

### Verify Setup

After running all files, verify with:
```bash
cd C:\Windows\gAIng-brAin
npm run health:db
```

Should see: `✅ Supabase connection healthy`

## Alternative: One-Click SQL (Advanced)

If you're comfortable, you can concatenate all SQL files and run at once:

```bash
cat supabase/members.sql supabase/memories.sql supabase/memory_sources.sql supabase/memory_revisions.sql supabase/memory_votes.sql supabase/messages.sql supabase/task_queue.sql supabase/rls.sql supabase/updated_at.sql
```

Copy all output → Paste in SQL Editor → Run

## Troubleshooting

- **Error "relation already exists"**: Tables already created (ignore error)
- **Permission denied**: Make sure you're using Service Role Key
- **Connection timeout**: Check your Supabase project is active
