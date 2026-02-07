// Placeholder handler for GET /api/runs/:id
export async function handleRun(id: string): Promise<Response> {
  return new Response(JSON.stringify({ id, status: "unknown" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
