import { NextRequest, NextResponse } from "next/server";

/**
 * OMEGA Memory API Route
 * 
 * Proxies memory operations (upsert/query) to the OMEGA Gateway.
 */

const GATEWAY_URL = process.env.OMEGA_GATEWAY_URL || "http://localhost:8787";
const BEARER_TOKEN = process.env.OMEGA_API_BEARER_TOKEN || "";

type MemoryAction = "upsert" | "query";

interface MemoryRequest {
    action: MemoryAction;
    namespace?: string;
    // Upsert fields
    id?: string;
    content?: string;
    meta?: Record<string, unknown>;
    // Query fields
    query?: string;
    k?: number;
}

export async function POST(req: NextRequest) {
    try {
        const body: MemoryRequest = await req.json();
        const { action, ...payload } = body;

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (BEARER_TOKEN) {
            headers["Authorization"] = `Bearer ${BEARER_TOKEN}`;
        }

        let endpoint: string;
        let requestBody: Record<string, unknown>;

        switch (action) {
            case "upsert":
                endpoint = `${GATEWAY_URL}/v1/memory/upsert`;
                requestBody = {
                    namespace: payload.namespace || "default",
                    id: payload.id,
                    content: payload.content,
                    meta: payload.meta || {},
                };
                break;

            case "query":
                endpoint = `${GATEWAY_URL}/v1/memory/query`;
                requestBody = {
                    namespace: payload.namespace || "default",
                    query: payload.query,
                    k: payload.k || 8,
                };
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}. Use 'upsert' or 'query'.` },
                    { status: 400 }
                );
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("[OMEGA Memory] Error:", error);
        return NextResponse.json(
            {
                error: "Failed to process memory request",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 503 }
        );
    }
}
