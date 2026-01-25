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
import httpx
import json

app = FastAPI(title="OMEGA Gateway", version="0.1")
router = APIRouter(prefix="/api/v1")

def auth(authorization: str | None = Header(default=None)) -> None:
    if not settings.omega_api_bearer_token:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()
    if token != settings.omega_api_bearer_token:
        raise HTTPException(status_code=403, detail="Invalid bearer token.")

@app.on_event("startup")
def _startup() -> None:
    init_db()

@router.get("/health")
def health():
    return {"ok": True}

@router.get("/status")
def status():
    return {
        "model": settings.omega_model,
        "base_url": settings.omega_openai_base_url,
        "db": "pgvector",
        "auth": bool(settings.omega_api_bearer_token),
    }

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
            # fall back but include error for visibility
            system += f"\n\nNOTE: CollectiveBrain adapter error: {cb['error']}"

    # Compose prompt
    mem_block = ""
    if memory_hits:
        mem_lines = []
        for h in memory_hits[:6]:
            mem_lines.append(f"- ({h.get('score', 0):.3f}) {h.get('content','')}")
        mem_block = "\n\nRetrieved memory:\n" + "\n".join(mem_lines)

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": req.user + mem_block},
    ]
    reply = await chat_completion(messages, temperature=req.temperature, mode=req.mode)

    # Write back the interaction as memory (simple, can be improved)
    await upsert(req.namespace, f"USER: {req.user}\nASSISTANT: {reply}", meta={"type": "chat"})
    return ChatResponse(reply=reply, mode=req.mode, memory_hits=memory_hits)

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


# Generic proxy to any backend service
async def _proxy_to_service(request: Request, base_url: str, path_prefix: str, path_suffix: str, idem_key: str | None):
    target = base_url.rstrip("/") + "/" + path_prefix.strip("/")
    if path_suffix:
        target += "/" + path_suffix.strip("/")

    async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
        body = await request.body()
        headers = {
          k: v
          for k, v in request.headers.items()
          if k.lower() not in {"host", "content-length", "connection", "keep-alive"}
        }
        if settings.omega_internal_token:
            headers["x-internal-token"] = settings.omega_internal_token
        
        resp = await client.request(
            request.method,
            target,
            content=body if body else None,
            params=dict(request.query_params),
            headers=headers,
        )

    filtered_headers = {
        k: v
        for k, v in resp.headers.items()
        if k.lower() not in {"content-encoding", "transfer-encoding", "connection"}
    }
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=filtered_headers,
        media_type=resp.headers.get("content-type"),
    )

@router.api_route("/brain/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_brain(full_path: str, request: Request, _: None = Depends(auth)):
    return await _proxy_to_service(request, settings.omega_brain_base_url, "", full_path, None)

@router.api_route("/bridge/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_bridge(full_path: str, request: Request, _: None = Depends(auth)):
    # Assuming bridge base is port 8000
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
    append_event(
        "proxy.day-jobs",
        {"path": full_path, "status": response.status_code},
    )
    if idem_key and request.method.lower() in {"post", "put", "patch", "delete"}:
        store_response(idem_key, response.status_code, response.body)
    return response


# Backward compatibility health path
@app.get("/healthz")
def healthz():
    return {"ok": True}


app.include_router(router)
