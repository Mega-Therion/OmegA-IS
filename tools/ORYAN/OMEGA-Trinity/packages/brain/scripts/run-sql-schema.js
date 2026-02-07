#!/usr/bin/env node

/**
 * Run SQL Schema File in Supabase
 * Executes the files.sql schema against your Supabase database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSqlSchema() {
  console.log('🚀 Running SQL schema setup...\n');

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'files.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf-8');

    console.log('📄 Loaded SQL schema from: supabase/files.sql');
    console.log('📊 Executing SQL commands...\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      // If exec_sql function doesn't exist, we need to run it manually
      console.log('⚠️  Direct SQL execution not available via RPC.');
      console.log('\n📋 Please run the SQL manually in Supabase:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/_/sql');
      console.log('   2. Copy the contents of: supabase/files.sql');
      console.log('   3. Paste and run in the SQL Editor');
      console.log('\n   Or install Supabase CLI: npm install -g supabase');
      console.log('   Then run: supabase db push\n');

      // Show the SQL file path for easy access
      console.log(`📂 SQL file location: ${sqlPath}`);

      process.exit(1);
    }

    console.log('✅ SQL schema executed successfully!');
    console.log('\n📊 Created:');
    console.log('   - files table with full-text search');
    console.log('   - Indexes for performance');
    console.log('   - Helper functions (search_files, get_agent_files, etc.)');
    console.log('   - RLS policies');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n⚠️  Falling back to manual setup instructions:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Run the SQL from: supabase/files.sql\n');
  }
}

runSqlSchema();
