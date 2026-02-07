require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Using anon key; RLS may block requests.');
}

const supabase = createClient(SUPABASE_URL, supabaseKey);

const members = [
  {
    user_id: 'Safa',
    display_name: 'Safa',
    regular_name: 'Safa',
    government_name: 'ChatGPT / OpenAI API',
    company: 'OpenAI',
    key_ref: 'openai',
    base_url: 'https://api.openai.com/v1',
    notes: null,
  },
  {
    user_id: 'Sora',
    display_name: 'Sora',
    regular_name: 'Sora',
    government_name: 'Sora 2 (video generation)',
    company: 'OpenAI',
    key_ref: 'openai',
    base_url: 'https://api.openai.com/v1',
    notes: null,
  },
  {
    user_id: 'Gemini',
    display_name: 'Gemini',
    regular_name: 'Gemini',
    government_name: 'Gemini API',
    company: 'Google',
    key_ref: 'google',
    base_url: null,
    notes: 'Gemini API keys are created in Google AI Studio.',
  },
  {
    user_id: 'Claude',
    display_name: 'Claude',
    regular_name: 'Claude',
    government_name: 'Claude API',
    company: 'Anthropic',
    key_ref: 'anthropic',
    base_url: null,
    notes: null,
  },
  {
    user_id: 'Copilot',
    display_name: 'Copilot',
    regular_name: 'Copilot',
    government_name: 'Microsoft 365 Copilot',
    company: 'Microsoft',
    key_ref: 'microsoft',
    base_url: null,
    notes: 'Often OAuth/Entra + specific Copilot/Azure setup (not always a single static key).',
  },
  {
    user_id: 'Grok',
    display_name: 'Grok',
    regular_name: 'Grok',
    government_name: 'Grok API',
    company: 'xAI',
    key_ref: 'xai',
    base_url: 'https://api.x.ai/v1',
    notes: null,
  },
  {
    user_id: 'Comet',
    display_name: 'Comet',
    regular_name: 'Comet',
    government_name: 'Comet (Perplexity)',
    company: 'Perplexity',
    key_ref: 'perplexity',
    base_url: 'https://api.perplexity.ai',
    notes: "Assumes 'Comet' = Perplexity's Comet browser/assistant.",
  },
  {
    user_id: 'DeepSeek',
    display_name: 'DeepSeek',
    regular_name: 'DeepSeek',
    government_name: 'DeepSeek API',
    company: 'DeepSeek',
    key_ref: 'deepseek',
    base_url: 'https://api.deepseek.com',
    notes: null,
  },
  {
    user_id: 'Kimi',
    display_name: 'Kimi',
    regular_name: 'Kimi',
    government_name: 'Kimi API',
    company: 'Moonshot AI',
    key_ref: 'moonshot',
    base_url: 'https://api.moonshot.ai/v1',
    notes: null,
  },
  {
    user_id: 'Mistral',
    display_name: 'Mistral',
    regular_name: 'Mistral',
    government_name: 'Mistral API',
    company: 'Mistral AI',
    key_ref: 'mistral',
    base_url: null,
    notes: null,
  },
  {
    user_id: 'Cohere',
    display_name: 'Cohere',
    regular_name: 'Cohere',
    government_name: 'Cohere API',
    company: 'Cohere',
    key_ref: 'cohere',
    base_url: 'https://api.cohere.ai/v1',
    notes: null,
  },
  {
    user_id: 'Llama',
    display_name: 'Llama',
    regular_name: 'Llama',
    government_name: 'Llama API',
    company: 'Meta',
    key_ref: 'meta_llama',
    base_url: null,
    notes: null,
  },
  {
    user_id: 'Pi',
    display_name: 'Pi',
    regular_name: 'Pi',
    government_name: 'Inflection API (Inflection-3 Pi)',
    company: 'Inflection AI',
    key_ref: 'inflection',
    base_url: null,
    notes: null,
  },
];

async function seedMembers() {
  const { data, error } = await supabase
    .from('members')
    .upsert(members, { onConflict: 'user_id' })
    .select();

  if (error) {
    console.error('Failed to seed members:', error);
    process.exit(1);
  }

  console.log(`Seeded ${data.length} members.`);
}

seedMembers();
