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
from .soul import take_snapshot
from .dream import run_dream_cycle
from .kinetic import kinetic_bridge, KineticCommand, TelemetryReading
from .ipfs import ipfs_service
from .treasury import treasury_service, WalletCommand
from .diplomacy import diplomacy_bot
from .local_memory import local_memory
import httpx
import json
import asyncio

app = FastAPI(title="OMEGA Gateway", version="0.1")
router = APIRouter(prefix="/api/v1")

@app.on_event("startup")
async def _startup() -> None:
    init_db()
    asyncio.create_task(run_consolidation_cycle())
    asyncio.create_task(run_dream_cycle())
    asyncio.create_task(ipfs_service.backup_phylactery())

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
            resp = await client.get(f"{settings.brain_base_url}/health")
            results["brain"] = "ok" if resp.status_code == 200 else f"error:{resp.status_code}"
        except Exception as e:
            results["brain"] = f"unreachable:{str(e)[:50]}"
        bridge_url = settings.brain_base_url.replace(":8080", ":8000")
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
        "model": settings.model,
        "base_url": settings.openai_base_url,
        "db": "sqlite" if "sqlite" in (settings.db_url or "") else "pgvector",
        "auth": bool(settings.api_bearer_token),
    }

def auth(authorization: str | None = Header(default=None)) -> None:
    if not settings.api_bearer_token:
        return
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()
    if token != settings.api_bearer_token:
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
    
    # Take Soul Snapshots
    take_snapshot(req.user, "Architect")
    take_snapshot(reply, "System")
    
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
        if settings.internal_token:
            headers["x-internal-token"] = settings.internal_token
        resp = await client.request(request.method, target, content=body if body else None, params=dict(request.query_params), headers=headers)
    return Response(content=resp.content, status_code=resp.status_code, headers={k: v for k, v in resp.headers.items() if k.lower() not in {"content-encoding", "transfer-encoding", "connection"}}, media_type=resp.headers.get("content-type"))

@router.api_route("/brain/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_brain(full_path: str, request: Request, _: None = Depends(auth)):
    return await _proxy_to_service(request, settings.brain_base_url, "", full_path, None)

@router.api_route("/bridge/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_bridge(full_path: str, request: Request, _: None = Depends(auth)):
    bridge_url = settings.brain_base_url.replace(":8080", ":8000")
    return await _proxy_to_service(request, bridge_url, "v1", full_path, None)

@router.api_route("/podcast/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_podcast(full_path: str, request: Request, _: None = Depends(auth)):
    return await _proxy_to_service(request, settings.brain_base_url, "podcast", full_path, None)

@router.api_route("/day-jobs/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_day_jobs(full_path: str, request: Request, _: None = Depends(auth)):
    idem_key = request.headers.get("x-idempotency-key")
    if idem_key:
        cached = get_cached_response(idem_key)
        if cached:
            status, body = cached
            return Response(content=body, status_code=status, media_type="application/json")
    response = await _proxy_to_service(request, settings.brain_base_url, "day-jobs", full_path, idem_key)
    append_event("proxy.day-jobs", {"path": full_path, "status": response.status_code})
    if idem_key and request.method.lower() in {"post", "put", "patch", "delete"}:
        store_response(idem_key, response.status_code, response.body)
    return response

# --- KINETIC SOVEREIGN (ARK BUS) ---

@router.get("/ark/devices")
async def get_ark_devices(_: None = Depends(auth)):
    return await kinetic_bridge.get_devices()

@router.post("/ark/devices/{device_id}/command")
async def post_ark_command(device_id: str, req: KineticCommand, _: None = Depends(auth)):
    return await kinetic_bridge.execute_command(device_id, req.command)

@router.post("/ark/devices/{device_id}/telemetry")
async def post_ark_telemetry(device_id: str, reading: TelemetryReading, _: None = Depends(auth)):
    await kinetic_bridge.push_telemetry(device_id, reading)
    return {"status": "recorded"}

# --- ECONOMIC SOVEREIGN (TREASURY) ---

@router.get("/treasury/balance")
async def get_treasury_balance(_: None = Depends(auth)):
    return await treasury_service.get_balances()

@router.post("/treasury/execute")
async def post_treasury_execute(req: WalletCommand, _: None = Depends(auth)):
    if req.command == "pay":
        return await treasury_service.execute_payment(req.amount, req.service)
    elif req.command == "collect":
        return await treasury_service.collect_revenue(req.amount, req.source)
    else:
        raise HTTPException(status_code=400, detail="Invalid wallet command")

# --- SOCIAL SOVEREIGN (DIPLOMACY) ---

class NegotiationRequest(BaseModel):
    provider: str
    context: str

@router.get("/diplomacy/reputation")
async def get_reputation(_: None = Depends(auth)):
    return await diplomacy_bot.get_reputation()

@router.post("/diplomacy/negotiate")
async def post_negotiate(req: NegotiationRequest, _: None = Depends(auth)):
    return await diplomacy_bot.initiate_negotiation(req.provider, req.context)

# --- LOCAL MEMORY ---

@router.post("/local_memory/context")
async def get_local_context(req: QueryRequest, _: None = Depends(auth)):
    context = await local_memory.get_context(req.query, req.k)
    return {"context": context}

# --- MESH SOVEREIGNTY ---

class HeartbeatUpdate(BaseModel):
    node_id: str
    status: str
    peers: int
    latency: str

@router.post("/mesh/heartbeat")
async def post_mesh_heartbeat(req: HeartbeatUpdate, _: None = Depends(auth)):
    # Log the mesh heartbeat to events
    append_event("mesh.heartbeat", req.dict(), actor=req.node_id)
    return {"status": "heartbeat_received", "timestamp": datetime.utcnow().isoformat()}

# --- TASK GRAPH PERSISTENCE ---

class TaskGraphSaveRequest(BaseModel):
    mission_id: str
    mission_description: str
    status: str
    graph_json: dict
    sub_tasks: List[dict] # List of SubTask dicts

@router.post("/task_graph/save")
async def save_task_graph(req: TaskGraphSaveRequest, _: None = Depends(auth)):
    engine = get_engine()
    ts_func = "NOW()" if engine.dialect.name == "postgresql" else "datetime('now')"
    
    with engine.begin() as conn:
        conn.execute(
            text(f"""
                INSERT INTO omega_task_graph (mission_id, mission_description, status, graph_json, created_at, updated_at)
                VALUES (:mission_id, :mission_description, :status, :graph_json, {ts_func}, {ts_func})
                ON CONFLICT (mission_id) DO UPDATE SET
                    mission_description = EXCLUDED.mission_description,
                    status = EXCLUDED.status,
                    graph_json = EXCLUDED.graph_json,
                    updated_at = {ts_func};
            """),
            {
                "mission_id": req.mission_id,
                "mission_description": req.mission_description,
                "status": req.status,
                "graph_json": json.dumps(req.graph_json),
            }
        )
        
        # Save sub-tasks
        for sub_task in req.sub_tasks:
            conn.execute(
                text("""
                    INSERT INTO omega_sub_tasks (id, mission_id, description, depends_on, assigned_agent, status, output)
                    VALUES (:id, :mission_id, :description, :depends_on, :assigned_agent, :status, :output)
                    ON CONFLICT (id) DO UPDATE SET
                        description = EXCLUDED.description,
                        depends_on = EXCLUDED.depends_on,
                        assigned_agent = EXCLUDED.assigned_agent,
                        status = EXCLUDED.status,
                        output = EXCLUDED.output;
                """),
                {
                    "id": sub_task["id"],
                    "mission_id": req.mission_id,
                    "description": sub_task["description"],
                    "depends_on": json.dumps(sub_task["depends_on"]),
                    "assigned_agent": sub_task["assigned_agent"],
                    "status": sub_task["status"],
                    "output": sub_task["output"],
                }
            )
            
    return {"status": "success", "mission_id": req.mission_id}

@router.get("/task_graph/load/{mission_id}")
async def load_task_graph(mission_id: str, _: None = Depends(auth)):
    engine = get_engine()
    with engine.begin() as conn:
        graph_row = conn.execute(
            text("SELECT mission_description, status, graph_json FROM omega_task_graph WHERE mission_id = :mission_id"),
            {"mission_id": mission_id}
        ).mappings().first()
        
        if not graph_row:
            raise HTTPException(status_code=404, detail="Mission not found")
            
        sub_task_rows = conn.execute(
            text("SELECT id, description, depends_on, assigned_agent, status, output FROM omega_sub_tasks WHERE mission_id = :mission_id"),
            {"mission_id": mission_id}
        ).mappings().all()
        
        sub_tasks = []
        for row in sub_task_rows:
            st = dict(row)
            st["depends_on"] = json.loads(st["depends_on"])
            sub_tasks.append(st)
            
        return {
            "mission_id": mission_id,
            "mission_description": graph_row["mission_description"],
            "status": graph_row["status"],
            "graph_json": json.loads(graph_row["graph_json"]),
            "sub_tasks": sub_tasks
        }

@app.get("/healthz")
def healthz():
    return {"ok": True}

app.include_router(router)
