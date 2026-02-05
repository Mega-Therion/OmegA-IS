from __future__ import annotations
from fastapi import FastAPI, HTTPException, Depends, Header, Request, Response, APIRouter
from pydantic import BaseModel, Field
from .config import settings
from .db import init_db
from .llm import chat_completion
from .memory import upsert, query
from .collectivebrain_adapter import try_run_collective_brain
from .idempotency import get_cached_response, store_response
from .events import append_event
from .knowledge import kg
from .mcp import mcp_manager
from .consolidation import run_consolidation_cycle
import httpx
import json
import asyncio

app = FastAPI(title="OMEGA Gateway", version="0.1")
router = APIRouter(prefix="/api/v1")

@app.on_event("startup")
async def _startup() -> None:
    init_db()
    asyncio.create_task(run_consolidation_cycle())

@app.get("/")
def root():
    return {"service": "OMEGA Gateway", "version": "0.1", "status": "operational"}

@app.get("/health")
async def root_health():
    """Quick health check at root level."""
    return {"ok": True, "service": "Gateway", "version": "0.1"}

@app.get("/health/deep")
async def deep_health():
    """Deep health check - pings Brain and Bridge services."""
    results = {"gateway": "ok", "brain": "unknown", "bridge": "unknown"}
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"{settings.omega_brain_base_url}/health")
            results["brain"] = "ok" if resp.status_code == 200 else f"error:{resp.status_code}"
        except Exception as e:
            results["brain"] = f"unreachable:{str(e)[:50]}"
        bridge_url = settings.omega_brain_base_url.replace(":8080", ":8000")
        try:
            resp = await client.get(f"{bridge_url}/health")
            results["bridge"] = "ok" if resp.status_code == 200 else f"error:{resp.status_code}"
        except Exception as e:
            results["bridge"] = f"unreachable:{str(e)[:50]}"
    all_ok = all(v == "ok" for v in results.values())
    return {"ok": all_ok, "services": results}

@router.get("/health")
def health():
    return {"ok": True, "service": "Gateway", "version": "0.1"}

@router.get("/status")
def status():
    return {
        "model": settings.omega_model,
        "base_url": settings.omega_openai_base_url,
        "db": "sqlite" if "sqlite" in (settings.omega_db_url or "") else "pgvector",
        "auth": bool(settings.omega_api_bearer_token),
    }

def auth(authorization: str | None = Header(default=None)) -> None:
    if not settings.omega_api_bearer_token:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()
    if token != settings.omega_api_bearer_token:
        raise HTTPException(status_code=403, detail="Invalid bearer token.")

class ChatRequest(BaseModel):
    user: str = Field(..., description="User message.")
    namespace: str = Field(default="default", description="Memory namespace.")
    use_memory: bool = Field(default=True)
    use_collectivebrain: bool = Field(default=False)
    temperature: float = Field(default=0.2)
    mode: str = Field(default="omega", description="AI mode: omega, local, cloud, anthropic, claude, google, gemini, perplexity, deepseek, xai, grok")

class ChatResponse(BaseModel):
    reply: str
    mode: str = "llm"
    memory_hits: list[dict] = Field(default_factory=list)

@router.post("/chat", response_model=ChatResponse)
async def v1_chat(req: ChatRequest, _: None = Depends(auth)):
    memory_hits = []
    system = "You are OMEGA, a pragmatic assistant that can use retrieved memory snippets when provided. Be concise and accurate."
    if req.use_memory:
        memory_hits = await query(req.namespace, req.user, k=6)
    if req.use_collectivebrain:
        cb = try_run_collective_brain(req.user, context={"memory_hits": memory_hits})
        if cb and "result" in cb:
            return ChatResponse(reply=str(cb["result"]), mode="collectivebrain", memory_hits=memory_hits)
        elif cb and "error" in cb:
            system += f"\n\nNOTE: CollectiveBrain adapter error: {cb['error']}"

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": req.user + (("\n\nRetrieved memory:\n" + "\n".join([f"- ({h.get('score', 0):.3f}) {h.get('content','')}" for h in memory_hits[:6]])) if memory_hits else "")},
    ]
    reply = await chat_completion(messages, temperature=req.temperature, mode=req.mode)
    await upsert(req.namespace, f"USER: {req.user}\nASSISTANT: {reply}", meta={"type": "chat"})
    
    if "[FACT]" in reply:
        try:
            parts = [p.strip() for p in reply.split("[FACT]")[1].split("|")]
            if len(parts) >= 3:
                kg.upsert_relation(parts[0], parts[1], parts[2], meta={"source": "chat_extraction"})
        except: pass

    return ChatResponse(reply=reply, mode=req.mode, memory_hits=memory_hits)

class MCPCallRequest(BaseModel):
    server: str
    tool: str
    arguments: dict = Field(default_factory=dict)

@router.get("/mcp/tools")
async def v1_mcp_list(_: None = Depends(auth)):
    return await mcp_manager.list_tools()

@router.post("/mcp/tool/call")
async def v1_mcp_call(req: MCPCallRequest, _: None = Depends(auth)):
    try:
        result = await mcp_manager.call_tool(req.server, req.tool, req.arguments)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class UpsertRequest(BaseModel):
    namespace: str = "default"
    id: str | None = None
    content: str
    meta: dict = Field(default_factory=dict)

@router.post("/memory/upsert")
async def v1_mem_upsert(req: UpsertRequest, request: Request, _: None = Depends(auth)):
    idem_key = request.headers.get("x-idempotency-key")
    if idem_key:
        cached = get_cached_response(idem_key)
        if cached:
            status, body = cached
            return Response(content=body, status_code=status, media_type="application/json")
    mem_id = await upsert(req.namespace, req.content, meta=req.meta, id=req.id)
    result = {"id": mem_id}
    append_event("memory.upsert", {"namespace": req.namespace, "id": mem_id, "meta": req.meta})
    content = json.dumps(result)
    if idem_key:
        store_response(idem_key, 200, content.encode("utf-8"))
    return Response(content=content, media_type="application/json", status_code=200)

class QueryRequest(BaseModel):
    namespace: str = "default"
    query: str
    k: int = 8

@router.post("/memory/query")
async def v1_mem_query(req: QueryRequest, _: None = Depends(auth)):
    hits = await query(req.namespace, req.query, k=req.k)
    return {"hits": hits}

async def _proxy_to_service(request: Request, base_url: str, path_prefix: str, path_suffix: str, idem_key: str | None):
    target = base_url.rstrip("/") + "/" + path_prefix.strip("/")
    if path_suffix:
        target += "/" + path_suffix.strip("/")
    async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
        body = await request.body()
        headers = {k: v for k, v in request.headers.items() if k.lower() not in {"host", "content-length", "connection", "keep-alive"}}
        if settings.omega_internal_token:
            headers["x-internal-token"] = settings.omega_internal_token
        resp = await client.request(request.method, target, content=body if body else None, params=dict(request.query_params), headers=headers)
    return Response(content=resp.content, status_code=resp.status_code, headers={k: v for k, v in resp.headers.items() if k.lower() not in {"content-encoding", "transfer-encoding", "connection"}}, media_type=resp.headers.get("content-type"))

@router.api_route("/brain/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_brain(full_path: str, request: Request, _: None = Depends(auth)):
    return await _proxy_to_service(request, settings.omega_brain_base_url, "", full_path, None)

@router.api_route("/bridge/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_bridge(full_path: str, request: Request, _: None = Depends(auth)):
    bridge_url = settings.omega_brain_base_url.replace(":8080", ":8000")
    return await _proxy_to_service(request, bridge_url, "v1", full_path, None)

@router.api_route("/podcast/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_podcast(full_path: str, request: Request, _: None = Depends(auth)):
    return await _proxy_to_service(request, settings.omega_brain_base_url, "podcast", full_path, None)

@router.api_route("/day-jobs/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_day_jobs(full_path: str, request: Request, _: None = Depends(auth)):
    idem_key = request.headers.get("x-idempotency-key")
    if idem_key:
        cached = get_cached_response(idem_key)
        if cached:
            status, body = cached
            return Response(content=body, status_code=status, media_type="application/json")
    response = await _proxy_to_service(request, settings.omega_brain_base_url, "day-jobs", full_path, idem_key)
    append_event("proxy.day-jobs", {"path": full_path, "status": response.status_code})
    if idem_key and request.method.lower() in {"post", "put", "patch", "delete"}:
        store_response(idem_key, response.status_code, response.body)
    return response

@app.get("/healthz")
def healthz():
    return {"ok": True}

app.include_router(router)
