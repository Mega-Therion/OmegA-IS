const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

if (!config.SUPABASE_URL || !config.supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
}

if (!config.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not set; using anon key which may fail with RLS.');
}

const supabase = createClient(config.SUPABASE_URL, config.supabaseKey);

module.exports = supabase;
