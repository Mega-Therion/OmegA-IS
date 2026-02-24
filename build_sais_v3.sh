#!/bin/bash
set -e

# 1. Update Environment with new SAM.gov Key
grep -q "SAM_GOV_API_KEY=3jeGfv17HbHtxlmVnuW9N6c2NMn6YQWY0vLeHbOm" /home/mega/.omega_keys.env || echo "SAM_GOV_API_KEY=3jeGfv17HbHtxlmVnuW9N6c2NMn6YQWY0vLeHbOm" >> /home/mega/.omega_keys.env

# 2. Local File Generation (No Supabase Auth Required)
# Generate API-Powered n8n Workflow
mkdir -p /home/mega/NEXUS/OmegA/OmegA-SI/n8n/workflows
cat << 'INNER_EOF' > /home/mega/NEXUS/OmegA/OmegA-SI/n8n/workflows/sais_api_final.json
{
  "name": "SAIS_API_Ingestion_Final",
  "nodes": [
    { "parameters": { "rule": { "interval": [ { "field": "cronExpression", "expression": "0 9,21 * * *" } ] } }, "name": "Schedule Trigger", "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1, "position": [ 100, 100 ] },
    { "parameters": { "url": "https://api.sam.gov/opportunities/v2/search", "sendQuery": true, "queryParameters": { "parameters": [ { "name": "api_key", "value": "3jeGfv17HbHtxlmVnuW9N6c2NMn6YQWY0vLeHbOm" }, { "name": "state", "value": "AR" }, { "name": "limit", "value": "100" } ] } }, "name": "SAM.gov API", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.1, "position": [ 300, 100 ] }
  ],
  "connections": { "Schedule Trigger": { "main": [ [ { "node": "SAM.gov API", "type": "main", "index": 0 } ] ] } }
}
INNER_EOF

# Update local Edge Function file
mkdir -p /home/mega/NEXUS/OmegA/OmegA-SI/supabase/functions/generate-sais-report
cat << 'INNER_EOF' > /home/mega/NEXUS/OmegA/OmegA-SI/supabase/functions/generate-sais-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data: events } = await supabase.from('sais_events').select('*').gte('timestamp', twelveHoursAgo)
  
  const reportText = "🚨 *SAIS INTELLIGENCE BRIEFING*\n\n" + 
                     (events?.map(e => \`🔹 *\${e.title}*\nAmt: \$\${e.money_amount}\nSource: \${e.source_url}\n\`).join("\n") || "No new events detected.");

  // DIRECT DISPATCH VIA CODEX BOT
  await fetch("https://api.telegram.org/bot8438807813:AAGUGJp26tL-XMr_u91w6cyBfJPMOweNO6c/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: "-1003595805129",
      text: reportText,
      parse_mode: "Markdown"
    })
  })

  return new Response("Briefing Sent via Codex", { status: 200 })
})
INNER_EOF

echo "✅ Local V3 Build Artifacts generated. Deploy via 'supabase login' manually."
