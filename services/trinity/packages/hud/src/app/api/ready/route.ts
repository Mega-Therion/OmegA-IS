import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    service: "hud",
    timestamp: new Date().toISOString(),
  });
}
