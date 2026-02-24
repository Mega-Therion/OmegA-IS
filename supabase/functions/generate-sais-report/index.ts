import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data: events } = await supabase.from('sais_events').select('*').gte('timestamp', twelveHoursAgo)
  
  const reportText = "🚨 *SAIS INTELLIGENCE BRIEFING*\n\n" + 
                     (events?.map(e => `🔹 *${e.title}*\nAmt: $${e.money_amount}\nSource: ${e.source_url}\n`).join("\n") || "No new events detected.");

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