#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Try to query something simple
    const { data, error } = await supabase.from('messages').select('count').limit(1);

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Connection successful!');
      console.log('Result:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

test();
