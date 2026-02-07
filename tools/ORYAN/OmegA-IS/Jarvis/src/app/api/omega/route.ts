import { NextRequest, NextResponse } from "next/server";

/**
 * OMEGA Gateway API Route
 * 
 * Proxies requests to the OMEGA Gateway for chat completions.
 * Supports memory-augmented responses and CollectiveBrain integration.
 */

const GATEWAY_URL = process.env.OMEGA_GATEWAY_URL || "http://localhost:8787";
const BEARER_TOKEN = process.env.OMEGA_API_BEARER_TOKEN || "";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (BEARER_TOKEN) {
            headers["Authorization"] = `Bearer ${BEARER_TOKEN}`;
        }

        const response = await fetch(`${GATEWAY_URL}/v1/chat`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });

        const text = await response.text();

        return new NextResponse(text, {
            status: response.status,
            headers: {
                "Content-Type": response.headers.get("content-type") || "application/json",
            },
        });
    } catch (error) {
        console.error("[OMEGA] Gateway error:", error);
        return NextResponse.json(
            {
                reply: "Failed to connect to OMEGA Gateway. Is it running on " + GATEWAY_URL + "?",
                mode: "error",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 503 }
        );
    }
}

export async function GET() {
    try {
        const response = await fetch(`${GATEWAY_URL}/v1/status`);
        const data = await response.json();
        return NextResponse.json({ ok: true, gateway: GATEWAY_URL, ...data });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                gateway: GATEWAY_URL,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 503 }
        );
    }
}
