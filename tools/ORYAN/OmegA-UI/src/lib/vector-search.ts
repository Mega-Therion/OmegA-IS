// Vector operations for semantic search in IndexedDB
import { getOrchestratorKey, getOrchestratorUrl, getUtilsEnabled } from "@/lib/orchestrator-config";

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;
  
  return dotProduct / magnitude;
}

/**
 * Find top-k most similar items based on embedding similarity
 */
export function findSimilar<T extends { embedding?: number[] }>(
  query: number[],
  items: T[],
  topK: number = 5,
  minSimilarity: number = 0.3
): { item: T; similarity: number }[] {
  const results: { item: T; similarity: number }[] = [];
  
  for (const item of items) {
    if (!item.embedding || item.embedding.length === 0) continue;
    
    const similarity = cosineSimilarity(query, item.embedding);
    if (similarity >= minSimilarity) {
      results.push({ item, similarity });
    }
  }
  
  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);
  
  return results.slice(0, topK);
}

const getEmbeddingUrl = () => `${getOrchestratorUrl().replace(/\/$/, "")}/api/embeddings`;
const getUtilityUrl = () => `${getOrchestratorUrl().replace(/\/$/, "")}/api/utilities`;

/**
 * Generate embeddings for texts via the AI gateway
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    if (!getUtilsEnabled()) return texts.map(() => []);
    const response = await fetch(getEmbeddingUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getOrchestratorKey() ? { "X-Omega-Key": getOrchestratorKey() } : {}),
      },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      return texts.map(() => []);
    }

    const data = await response.json();
    return data.embeddings || texts.map(() => []);
  } catch {
    return texts.map(() => []);
  }
}

/**
 * Generate a single embedding for a text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0] || [];
}

interface Agent {
  id: string;
  name: string;
  role: string;
  strengths: string[];
}

/**
 * Route a query to the best agent
 */
export async function routeToAgent(query: string, agents: Agent[]): Promise<string | null> {
  if (!agents.length) return null;
  try {
    if (!getUtilsEnabled()) return agents[0]?.id || null;
    const response = await fetch(getUtilityUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getOrchestratorKey() ? { "X-Omega-Key": getOrchestratorKey() } : {}),
      },
      body: JSON.stringify({
        type: "route_agent",
        content: query,
        agents,
      }),
    });

    if (!response.ok) return agents[0]?.id || null;

    const data = await response.json();
    const agentId = data.result?.trim();

    if (agents.some(a => a.id === agentId)) {
      return agentId;
    }
    return agents[0]?.id || null;
  } catch {
    return agents[0]?.id || null;
  }
}

/**
 * Generate a conversation title from the first message
 */
export async function generateTitle(firstMessage: string): Promise<string> {
  try {
    if (!getUtilsEnabled()) {
      return firstMessage.split(" ").slice(0, 5).join(" ") || "New Chat";
    }
    const response = await fetch(getUtilityUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getOrchestratorKey() ? { "X-Omega-Key": getOrchestratorKey() } : {}),
      },
      body: JSON.stringify({
        type: "generate_title",
        content: firstMessage,
      }),
    });

    if (!response.ok) {
      return firstMessage.split(" ").slice(0, 5).join(" ") || "New Chat";
    }

    const data = await response.json();
    return data.result?.trim() || "New Chat";
  } catch {
    return firstMessage.split(" ").slice(0, 5).join(" ") || "New Chat";
  }
}
