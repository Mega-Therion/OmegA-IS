
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials.');
    process.exit(1);
}

// Minimal client configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: false
    }
    // Removed explicit db: { schema: 'public' } as it was causing issues for some reason
});

(async () => {
    console.log(`Connecting to ${SUPABASE_URL}...`);
    try {
        // Test 1: Just list tables (if possible via rpc) or check a known table
        // We will try to read 'members' table.
        const { data, error } = await supabase.from('members').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Check failed:', error);
            // If table doesn't exist, it might return 404 or specific error
        } else {
            console.log('Connection Successful! Members table access OK.');
            console.log('Count result:', data, '(Status: OK)');
        }

    } catch (e) {
        console.error('Exception:', e.message);
    }
})();
