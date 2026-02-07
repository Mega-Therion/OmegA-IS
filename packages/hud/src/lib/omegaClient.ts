/**
 * OMEGA Gateway Client Library
 * 
 * Provides typed client for communicating with the OMEGA Gateway.
 */

export type OmegaChatRequest = {
    user: string;
    namespace?: string;
    use_memory?: boolean;
    use_collectivebrain?: boolean;
    temperature?: number;
};

export type OmegaChatResponse = {
    reply: string;
    mode: string;
    memory_hits?: Array<{
        id: string;
        content: string;
        score: number;
        meta?: Record<string, unknown>;
    }>;
};

export type OmegaMemoryUpsertRequest = {
    namespace?: string;
    id?: string;
    content: string;
    meta?: Record<string, unknown>;
};

export type OmegaMemoryQueryRequest = {
    namespace?: string;
    query: string;
    k?: number;
};

export type OmegaMemoryHit = {
    id: string;
    ts: string;
    content: string;
    meta: Record<string, unknown>;
    score: number;
};

const DEFAULT_OPTIONS: Partial<OmegaChatRequest> = {
    namespace: "default",
    use_memory: true,
    use_collectivebrain: false,
    temperature: 0.2,
};

/**
 * Send a chat message to OMEGA Gateway
 */
export async function omegaChat(req: OmegaChatRequest): Promise<OmegaChatResponse> {
    const response = await fetch("/api/omega", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...DEFAULT_OPTIONS, ...req }),
    });

    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return { reply: text, mode: "unknown" };
    }
}

/**
 * Upsert a memory to OMEGA Gateway
 */
export async function omegaMemoryUpsert(req: OmegaMemoryUpsertRequest): Promise<{ id: string }> {
    const response = await fetch("/api/omega/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert", ...req }),
    });
    return response.json();
}

/**
 * Query memories from OMEGA Gateway
 */
export async function omegaMemoryQuery(req: OmegaMemoryQueryRequest): Promise<{ hits: OmegaMemoryHit[] }> {
    const response = await fetch("/api/omega/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "query", ...req }),
    });
    return response.json();
}
