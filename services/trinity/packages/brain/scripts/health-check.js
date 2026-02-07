require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Using anon key; RLS may block requests.');
}

// Config with explicit schema (or try removing schema option if "public" is default invalid)
// Some setups fail when schema is explicitly 'public' if the user doesn't havepermissions or it's misconfigured.
// We'll try without options first, which defaults to 'public'.

const supabase = createClient(SUPABASE_URL, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

(async () => {
  try {
    console.log('Testing connection to Supabase...');

    // Try a simple health check query (no table) via rpc if possible, or basic table check

    // Just check if we can query the `members` table
    const { data, error } = await supabase
      .from('members')
      .select('user_id')
      .limit(1);

    if (error) {
      console.error('Supabase query failed:', error.message);
      // Don't crash hard, just report
      process.exit(1);
    }

    console.log(`Supabase OK. members rows: ${data.length}`);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
