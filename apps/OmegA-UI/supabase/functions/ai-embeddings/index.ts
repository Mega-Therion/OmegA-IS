import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmbeddingRequest {
  texts: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts }: EmbeddingRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new Error("texts array is required");
    }

    // Use Gemini for embeddings via a prompt-based approach
    // We'll generate a semantic representation that can be compared
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are an embedding generator. Generate a 64-dimensional semantic embedding vector for the given text. 
Output ONLY a JSON array of 64 floating point numbers between -1 and 1 representing the semantic meaning.
The vector should capture: topics, sentiment, intent, entities, and abstract concepts.
No explanations, just the raw JSON array.`
            },
            { role: "user", content: text.slice(0, 2000) } // Limit text length
          ],
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Embedding generation failed:", errorText);
        // Return a zero vector on failure
        embeddings.push(new Array(64).fill(0));
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      try {
        // Parse the JSON array from the response
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const vector = JSON.parse(match[0]);
          if (Array.isArray(vector) && vector.length === 64) {
            embeddings.push(vector.map((n: number) => Math.max(-1, Math.min(1, n))));
          } else {
            embeddings.push(new Array(64).fill(0));
          }
        } else {
          embeddings.push(new Array(64).fill(0));
        }
      } catch {
        embeddings.push(new Array(64).fill(0));
      }
    }

    return new Response(JSON.stringify({ embeddings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-embeddings error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
