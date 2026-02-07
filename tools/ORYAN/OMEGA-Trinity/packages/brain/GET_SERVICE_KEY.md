# Get Your Supabase Service Role Key

Your file sync setup is almost complete! I just need the **service role key** from your Supabase dashboard.

## Quick Steps

### Option 1: Get from Dashboard (Recommended)

1. **Go to your Supabase project settings:**
   ```
   https://supabase.com/dashboard/project/qfuysggzmdgikjaplihe/settings/api
   ```

2. **Find the "service_role" key:**
   - Scroll down to the "Project API keys" section
   - Look for the **"service_role"** key (NOT the "anon" key)
   - Click "Reveal" to show it
   - It starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Copy the entire key**

4. **Paste it into your `.env` file:**
   - Open: `C:\Users\mega_\gAIng-Brain\gAIng-brAin\.env`
   - Replace `PLEASE_GET_FROM_DASHBOARD` with your actual service role key
   - Save the file

5. **Then tell me "done" and I'll run the sync!**

---

## Why Service Role Key?

The **service role key** has full admin access to your Supabase project, which is needed to:
- Create storage buckets
- Upload files
- Create database tables
- Set up RLS policies

The anon key (which we already have) has limited permissions.

---

## Security Note

- ⚠️ NEVER commit this key to git
- ⚠️ Only use it server-side (never in client code)
- ✅ It's safe to use in your `.env` file (which is gitignored)

---

## Current Status

✅ Correct Supabase URL configured
✅ Anon key verified
❌ Service role key needed

Once you add it, I'll:
1. Create the `gaing-files` storage bucket
2. Run the SQL schema to create the `files` table
3. Upload all your gAIng-brAin files
4. Index everything for searchability
