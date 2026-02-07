// Placeholder handler for POST /api/intent
export async function handleIntent(request: Request): Promise<Response> {
  const body = await request.json();
  return new Response(JSON.stringify({ ok: true, received: body }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
