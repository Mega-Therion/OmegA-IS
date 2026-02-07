import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UtilityRequest {
  type: "generate_title" | "route_agent" | "summarize";
  content: string;
  agents?: { id: string; name: string; role: string; strengths: string[] }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, agents }: UtilityRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = content;

    switch (type) {
      case "generate_title":
        systemPrompt = `Generate a short, descriptive title (3-6 words) for a conversation that starts with the given message. 
Output ONLY the title, no quotes, no punctuation at the end, no explanation.`;
        break;
      
      case "route_agent":
        if (!agents || agents.length === 0) {
          throw new Error("agents array required for routing");
        }
        systemPrompt = `You are an intelligent router that selects the best agent for a query.

Available agents:
${agents.map(a => `- ${a.name} (ID: ${a.id}): ${a.role}. Strengths: ${a.strengths.join(', ')}`).join('\n')}

Analyze the user's query and select the BEST agent to handle it.
Output ONLY the agent ID, nothing else.`;
        break;
      
      case "summarize":
        systemPrompt = `Summarize the following content in 1-2 concise sentences. Output only the summary.`;
        break;
      
      default:
        throw new Error(`Unknown utility type: ${type}`);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI utility error:", errorText);
      throw new Error("AI request failed");
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-utilities error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
