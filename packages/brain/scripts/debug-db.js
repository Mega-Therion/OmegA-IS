
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('URL:', SUPABASE_URL);
console.log('Key (start):', SUPABASE_KEY ? SUPABASE_KEY.substring(0, 10) + '...' : 'MISSING');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

(async () => {
    try {
        // Try a raw REST check using fetch if supabase-js fails weirdly
        const restUrl = `${SUPABASE_URL}/rest/v1/members?select=*&limit=1`;
        console.log('Trying REST directly:', restUrl);
        const res = await fetch(restUrl, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        console.log('REST Status:', res.status, res.statusText);
        const text = await res.text();
        console.log('REST Body:', text);

    } catch (e) {
        console.error('Exception:', e.message);
    }
})();
