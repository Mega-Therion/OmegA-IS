// Placeholder handler for GET /api/status
export async function handleStatus(): Promise<Response> {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
