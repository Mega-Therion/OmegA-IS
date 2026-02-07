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

const supabase = createClient(SUPABASE_URL, supabaseKey);

(async () => {
  const { data, error } = await supabase
    .from('members')
    .select('user_id')
    .limit(1);

  if (error) {
    console.error('Supabase query failed:', error.message);
    process.exit(1);
  }

  console.log(`Supabase OK. members rows: ${data.length}`);
})();
