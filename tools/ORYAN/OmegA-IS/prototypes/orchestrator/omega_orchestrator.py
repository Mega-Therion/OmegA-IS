#!/usr/bin/env python3
"""
omega_orchestrator.py

OmegA Orchestrator API (Spine)
==============================
This is the single "spine" service that ALL interfaces call:
- Web HUD (Vercel) -> /api/chat
- Telegram Bot -> /telegram/webhook
- Alexa Skill -> /alexa
- Tools (Hands, Vision, Browser) -> /tools/*
- Jobs -> /jobs/*

Hard Architecture Rules (baked in):
1) Thin Clients Rule:
   - HUD/Telegram/Alexa are thin clients. No business logic there.
   - They only forward user inputs and render outputs.

2) DOM-First Browser Rule:
   - For "Comet-like" browsing capability: prefer DOM/state snapshots and deterministic automation
     via a Browser tool (Playwright/Chromium controller) rather than pixel-only screenshot guesses.

This file is an operational skeleton:
- It defines stable endpoint contracts (Pydantic models).
- It provides a clean routing pipeline (auth -> session -> tool routing -> logging -> response).
- It includes stubs for Supabase, n8n, Ollama, Telegram send-back, and tool calls.

Run:
  pip install fastapi uvicorn httpx pydantic python-dotenv
  uvicorn omega_orchestrator:app --host 0.0.0.0 --port 8080

Environment variables (recommended):
  OMEGA_API_KEY=<your orchestrator key for HUD>
  SUPABASE_URL=...
  SUPABASE_SERVICE_ROLE_KEY=...
  TELEGRAM_BOT_TOKEN=...
  TELEGRAM_WEBHOOK_SECRET=...
  N8N_WEBHOOK_BASE=...
  OLLAMA_BASE_URL=http://localhost:11434
  HANDS_TOOL_URL=http://omega-host:7071
  VISION_TOOL_URL=http://omega-host:7072
  BROWSER_TOOL_URL=http://omega-host:7073

Note:
- This file does NOT attempt to be clever. Clever is where systems go to die.
"""

from __future__ import annotations

import os
import time
import uuid
import json
import hmac
import hashlib
from typing import Any, Dict, List, Optional, Literal, Union

import httpx
from fastapi import FastAPI, Request, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------

def _env(name: str, default: Optional[str] = None) -> str:
    val = os.getenv(name, default)
    return val if val is not None else ""

OMEGA_API_KEY = _env("OMEGA_API_KEY", "")
SUPABASE_URL = _env("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = _env("SUPABASE_SERVICE_ROLE_KEY", "")

TELEGRAM_BOT_TOKEN = _env("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_WEBHOOK_SECRET = _env("TELEGRAM_WEBHOOK_SECRET", "")

N8N_WEBHOOK_BASE = _env("N8N_WEBHOOK_BASE", "")  # e.g. https://n8n.yourdomain.com/webhook
OLLAMA_BASE_URL = _env("OLLAMA_BASE_URL", "http://localhost:11434")

HANDS_TOOL_URL = _env("HANDS_TOOL_URL", "")     # e.g. http://omega-host:7071
VISION_TOOL_URL = _env("VISION_TOOL_URL", "")   # e.g. http://omega-host:7072
BROWSER_TOOL_URL = _env("BROWSER_TOOL_URL", "") # e.g. http://omega-host:7073

DEFAULT_MODEL = _env("OMEGA_LLM_MODEL", "llama3.1")  # Ollama model name
EMBEDDING_MODEL = _env("OMEGA_EMBED_MODEL", DEFAULT_MODEL)
REQUEST_TIMEOUT_S = float(_env("OMEGA_HTTP_TIMEOUT_S", "30"))
MAX_TOOL_STEPS = int(_env("OMEGA_MAX_TOOL_STEPS", "6"))


# -----------------------------------------------------------------------------
# App
# -----------------------------------------------------------------------------

app = FastAPI(
    title="OmegA Orchestrator",
    version="0.3.1",
    description="The spine that connects HUD/Telegram/Alexa to Supabase + tools + workflows."
)


# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------

Channel = Literal["hud", "telegram", "alexa", "cli", "internal"]

class ClientContext(BaseModel):
    """Context provided by the calling interface (thin client)."""
    channel: Channel
    device: Optional[str] = None           # "iphone", "desktop", "echo", "omega-host"
    client_version: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None


class InputPayload(BaseModel):
    """Normalized input across channels."""
    text: Optional[str] = None
    # If you ever add audio upload, keep it as a reference, not raw bytes.
    audio_url: Optional[str] = None
    # channel-specific raw payload (stored in logs)
    raw: Optional[Dict[str, Any]] = None


class OrchestratorRequest(BaseModel):
    user_id: str = Field(..., description="Stable user identity (your mapping).")
    session_id: str = Field(..., description="Session continuity key.")
    ctx: ClientContext
    input: InputPayload
    permissions: Dict[str, Any] = Field(default_factory=dict, description="Policy flags, allowlists, role claims.")


class ActionReceipt(BaseModel):
    """A human-readable audit crumb for what happened."""
    type: str
    summary: str
    data: Dict[str, Any] = Field(default_factory=dict)


class OrchestratorResponse(BaseModel):
    session_id: str
    message_id: str
    text: str
    receipts: List[ActionReceipt] = Field(default_factory=list)
    artifacts: Dict[str, Any] = Field(default_factory=dict)
    # If voice channel wants audio back, provide URL (not bytes)
    audio_url: Optional[str] = None
    # Optional: present state snapshots
    screenshots: List[str] = Field(default_factory=list)
    dom_snapshots: List[Dict[str, Any]] = Field(default_factory=list)
    logs_ref: Optional[str] = None


# Tool contract models

class ToolCall(BaseModel):
    tool: Literal["hands", "vision", "browser", "workflow"]
    name: str
    args: Dict[str, Any] = Field(default_factory=dict)


class ToolResult(BaseModel):
    ok: bool
    name: str
    output: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


class StartJobRequest(BaseModel):
    user_id: str
    session_id: str
    channel: Channel
    job_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class StartJobResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "done", "failed"]
    logs_ref: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["queued", "running", "done", "failed"]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    updated_at: float


class EmbeddingRequest(BaseModel):
    texts: List[str]


class UtilityRequest(BaseModel):
    type: Literal["route_agent", "generate_title"]
    content: str
    agents: Optional[List[Dict[str, Any]]] = None


# -----------------------------------------------------------------------------
# Helpers: Auth / Security (thin but real)
# -----------------------------------------------------------------------------

def require_api_key(x_omega_key: Optional[str]) -> None:
    """Simple API key guard for HUD/API use. Telegram/Alexa use their own verification."""
    if not OMEGA_API_KEY:
        # If you didn't set it, we're not pretending. Lock it down before prod.
        raise HTTPException(status_code=500, detail="OMEGA_API_KEY is not set.")
    if not x_omega_key or x_omega_key != OMEGA_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key.")


def verify_telegram_webhook(request: Request, secret: str) -> None:
    """
    Optional extra protection: verify Telegram webhooks with a shared secret header.
    Telegram supports secret token header "X-Telegram-Bot-Api-Secret-Token".
    """
    if not secret:
        return
    token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if token != secret:
        raise HTTPException(status_code=401, detail="Invalid Telegram webhook secret.")


# -----------------------------------------------------------------------------
# Supabase stubs (replace with real client later)
# -----------------------------------------------------------------------------

class SupabaseClient:
    """
    Minimal placeholder for the operations we need:
    - auth/session mapping
    - memory/context retrieval
    - logs & receipts writing
    - job status persistence

    You can wire in:
      - supabase-py (Python client), or
      - direct PostgREST calls, or
      - direct Postgres driver
    """
    def __init__(self, url: str, service_key: str):
        self.url = url
        self.service_key = service_key

    async def get_session_context(self, user_id: str, session_id: str) -> Dict[str, Any]:
        # TODO: fetch from supabase "sessions" + "memories"
        return {
            "user_id": user_id,
            "session_id": session_id,
            "memory": [],
            "prefs": {},
        }

    async def append_message(self, user_id: str, session_id: str, channel: str, role: str, content: str) -> None:
        # TODO: persist messages table
        return

    async def write_action_log(self, user_id: str, session_id: str, entry: Dict[str, Any]) -> str:
        # TODO: persist action_logs; return log reference id
        return f"log_{uuid.uuid4().hex}"

    async def create_job(self, user_id: str, session_id: str, job_type: str, payload: Dict[str, Any]) -> str:
        # TODO: insert job row
        return f"job_{uuid.uuid4().hex}"

    async def update_job(self, job_id: str, status: str, result: Optional[Dict[str, Any]] = None, error: Optional[str] = None) -> None:
        # TODO: update job row
        return

    async def read_job(self, job_id: str) -> Dict[str, Any]:
        # TODO: read job row
        return {"job_id": job_id, "status": "queued", "result": None, "error": None, "updated_at": time.time()}


supabase = SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# -----------------------------------------------------------------------------
# Tool clients
# -----------------------------------------------------------------------------

async def call_tool(base_url: str, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not base_url:
        raise RuntimeError(f"Tool URL not configured for endpoint: {endpoint}")
    url = base_url.rstrip("/") + endpoint
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        return r.json()


async def tool_hands(command: str, cwd: Optional[str], env: Optional[Dict[str, str]], timeout_s: Optional[int]) -> ToolResult:
    try:
        out = await call_tool(HANDS_TOOL_URL, "/run", {
            "command": command,
            "cwd": cwd,
            "env": env or {},
            "timeout_s": timeout_s or 60,
        })
        return ToolResult(ok=True, name="hands.run", output=out)
    except Exception as e:
        return ToolResult(ok=False, name="hands.run", error=str(e))


async def tool_vision(mode: str = "screenshot", target: Optional[str] = None) -> ToolResult:
    """
    mode:
      - screenshot: returns image URL or base64
      - window: capture a window title
    """
    try:
        out = await call_tool(VISION_TOOL_URL, "/capture", {
            "mode": mode,
            "target": target
        })
        return ToolResult(ok=True, name="vision.capture", output=out)
    except Exception as e:
        return ToolResult(ok=False, name="vision.capture", error=str(e))


async def tool_browser(action: str, url: Optional[str] = None, selector: Optional[str] = None, text: Optional[str] = None) -> ToolResult:
    """
    DOM-FIRST browser tool.
    This is the Comet-like reliability path: we operate on page state, not just pixels.
    Example actions: open, snapshot, click, type, navigate, extract, wait.
    """
    try:
        out = await call_tool(BROWSER_TOOL_URL, "/browser", {
            "action": action,
            "url": url,
            "selector": selector,
            "text": text,
        })
        return ToolResult(ok=True, name=f"browser.{action}", output=out)
    except Exception as e:
        return ToolResult(ok=False, name=f"browser.{action}", error=str(e))


async def trigger_n8n_workflow(workflow: str, payload: Dict[str, Any]) -> ToolResult:
    try:
        if not N8N_WEBHOOK_BASE:
            raise RuntimeError("N8N_WEBHOOK_BASE is not set.")
        url = N8N_WEBHOOK_BASE.rstrip("/") + f"/{workflow.lstrip('/')}"
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            out = r.json() if "application/json" in r.headers.get("content-type", "") else {"text": r.text}
        return ToolResult(ok=True, name=f"workflow.{workflow}", output=out)
    except Exception as e:
        return ToolResult(ok=False, name=f"workflow.{workflow}", error=str(e))


# -----------------------------------------------------------------------------
# LLM (Ollama) helper
# -----------------------------------------------------------------------------

async def ollama_generate(prompt: str, system: str = "", model: str = DEFAULT_MODEL) -> str:
    """
    Minimal Ollama generation call. You can replace with a more structured tool-calling model later.
    """
    try:
        url = OLLAMA_BASE_URL.rstrip("/") + "/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system or "",
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("response", "")
    except Exception as e:
        # If the brain is down, we still respond with something honest.
        return f"[LLM unavailable: {e}]"


async def ollama_embed(text: str) -> List[float]:
    try:
        url = OLLAMA_BASE_URL.rstrip("/") + "/api/embeddings"
        payload = {
            "model": EMBEDDING_MODEL,
            "prompt": text,
        }
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
            r = await client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("embedding", [])
    except Exception:
        return []


def heuristic_route_agent(content: str, agents: List[Dict[str, Any]]) -> str:
    content_lower = content.lower()
    for agent in agents:
        strengths = agent.get("strengths") or []
        for strength in strengths:
            if strength.lower() in content_lower:
                return agent.get("id") or agent.get("name")
    return agents[0].get("id") or agents[0].get("name")


# -----------------------------------------------------------------------------
# Orchestration: routing + tool plan (simple + extensible)
# -----------------------------------------------------------------------------

SYSTEM_POLICY = """You are OmegA Orchestrator.
You must follow these architecture rules:
- Thin Clients: the caller is a UI pipe. You do the thinking and tool routing.
- DOM-First Browser: for web navigation tasks, prefer browser DOM snapshots/actions over screenshot guessing.
When you propose tools, you must return a JSON plan in this format:

PLAN:
{
  "answer": "<final user-facing text>",
  "tool_calls": [
    {"tool":"hands|vision|browser|workflow", "name":"...", "args":{...}}
  ]
}

If no tool calls are needed, tool_calls should be [].
Keep tool calls under MAX_TOOL_STEPS.
"""

def _extract_plan(text: str) -> Dict[str, Any]:
    """
    Very simple parser that looks for a JSON object after 'PLAN:'.
    Replace with robust structured outputs later.
    """
    if "PLAN:" not in text:
        return {"answer": text.strip(), "tool_calls": []}
    try:
        plan_str = text.split("PLAN:", 1)[1].strip()
        # If the model adds prose, attempt to isolate JSON object.
        start = plan_str.find("{")
        end = plan_str.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return {"answer": text.strip(), "tool_calls": []}
        obj = json.loads(plan_str[start:end+1])
        if "answer" not in obj:
            obj["answer"] = ""
        if "tool_calls" not in obj or not isinstance(obj["tool_calls"], list):
            obj["tool_calls"] = []
        return obj
    except Exception:
        return {"answer": text.strip(), "tool_calls": []}


async def route_and_execute(req: OrchestratorRequest) -> OrchestratorResponse:
    """
    The core spine function:
      - load session context (Supabase)
      - generate plan (LLM)
      - execute tool calls (bounded)
      - log everything
      - return response
    """
    message_id = f"msg_{uuid.uuid4().hex}"
    t0 = time.time()

    # Load session context (memory/state)
    ctx = await supabase.get_session_context(req.user_id, req.session_id)

    # Persist inbound message (normalized)
    inbound_text = req.input.text or ""
    await supabase.append_message(req.user_id, req.session_id, req.ctx.channel, "user", inbound_text)

    receipts: List[ActionReceipt] = []
    screenshots: List[str] = []
    dom_snapshots: List[Dict[str, Any]] = []

    # Prompt build (kept simple, you can upgrade to richer memory later)
    memory_stub = json.dumps(ctx.get("memory", [])[:20])
    prompt = f"""
User said: {inbound_text}

Channel: {req.ctx.channel}
Device: {req.ctx.device}

Known memory (truncated): {memory_stub}

Decide what to do. If tools are needed, produce a PLAN with tool_calls.
"""

    llm_text = await ollama_generate(prompt=prompt, system=SYSTEM_POLICY, model=DEFAULT_MODEL)
    plan = _extract_plan(llm_text)

    # Execute tool calls (bounded)
    tool_calls_raw = plan.get("tool_calls", [])[:MAX_TOOL_STEPS]
    tool_results: List[ToolResult] = []

    for tc in tool_calls_raw:
        try:
            call = ToolCall(**tc)
        except Exception as e:
            tool_results.append(ToolResult(ok=False, name="tool.parse", error=str(e)))
            continue

        if call.tool == "hands":
            cmd = call.args.get("command", "")
            cwd = call.args.get("cwd")
            env = call.args.get("env")
            timeout_s = call.args.get("timeout_s")
            res = await tool_hands(cmd, cwd=cwd, env=env, timeout_s=timeout_s)

        elif call.tool == "vision":
            mode = call.args.get("mode", "screenshot")
            target = call.args.get("target")
            res = await tool_vision(mode=mode, target=target)
            if res.ok:
                # Accept either a URL list or a single URL
                img = res.output.get("screenshot_url") or res.output.get("url")
                if img:
                    screenshots.append(img)

        elif call.tool == "browser":
            # DOM-FIRST automation path
            action = call.args.get("action", "snapshot")
            url = call.args.get("url")
            selector = call.args.get("selector")
            text_val = call.args.get("text")
            res = await tool_browser(action=action, url=url, selector=selector, text=text_val)
            if res.ok and isinstance(res.output, dict):
                snap = res.output.get("dom_snapshot")
                if isinstance(snap, dict):
                    dom_snapshots.append(snap)

        elif call.tool == "workflow":
            workflow = call.args.get("workflow", "default")
            payload = call.args.get("payload", {})
            res = await trigger_n8n_workflow(workflow, payload)

        else:
            res = ToolResult(ok=False, name=f"{call.tool}.{call.name}", error="Unknown tool type")

        tool_results.append(res)

        receipts.append(ActionReceipt(
            type=call.tool,
            summary=f"{call.name}: {'ok' if res.ok else 'failed'}",
            data={"result": res.output if res.ok else {"error": res.error}}
        ))

    # If tools ran, optionally produce a final answer grounded in tool outputs.
    # This keeps the UI thin and makes the orchestrator responsible for coherent output.
    if tool_results:
        tool_summary = json.dumps([tr.model_dump() for tr in tool_results], indent=2)[:9000]
        followup_prompt = f"""
User said: {inbound_text}

Tool results:
{tool_summary}

Write the final response to the user. Be specific. Mention what succeeded/failed.
"""
        final_text = await ollama_generate(prompt=followup_prompt, system="", model=DEFAULT_MODEL)
    else:
        final_text = plan.get("answer", "").strip() or llm_text.strip() or "No output."

    await supabase.append_message(req.user_id, req.session_id, req.ctx.channel, "assistant", final_text)

    # Write action log
    log_entry = {
        "message_id": message_id,
        "channel": req.ctx.channel,
        "user_id": req.user_id,
        "session_id": req.session_id,
        "input_text": inbound_text,
        "plan": plan,
        "tool_results": [tr.model_dump() for tr in tool_results],
        "duration_ms": int((time.time() - t0) * 1000),
    }
    logs_ref = await supabase.write_action_log(req.user_id, req.session_id, log_entry)

    return OrchestratorResponse(
        session_id=req.session_id,
        message_id=message_id,
        text=final_text,
        receipts=receipts,
        artifacts={},  # put file links, run outputs, etc. here later
        screenshots=screenshots,
        dom_snapshots=dom_snapshots,
        logs_ref=logs_ref,
    )


# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------

@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": "omega_orchestrator",
        "version": app.version,
        "time": time.time(),
        "rules": {
            "thin_clients": True,
            "dom_first_browser": True
        }
    }


@app.post("/api/embeddings")
async def api_embeddings(payload: EmbeddingRequest, x_omega_key: Optional[str] = Header(None)) -> JSONResponse:
    require_api_key(x_omega_key)
    embeddings = []
    for text in payload.texts:
        embeddings.append(await ollama_embed(text))
    return JSONResponse({"embeddings": embeddings})


@app.post("/api/utilities")
async def api_utilities(payload: UtilityRequest, x_omega_key: Optional[str] = Header(None)) -> JSONResponse:
    require_api_key(x_omega_key)

    if payload.type == "route_agent":
        agents = payload.agents or []
        if not agents:
            return JSONResponse({"result": ""})

        if OLLAMA_BASE_URL:
            prompt = """Pick the best agent ID to handle this request.
Return ONLY the id value and nothing else.
Request: {content}
Agents: {agents}
""".format(content=payload.content, agents=json.dumps(agents))
            response = await ollama_generate(prompt=prompt, system="", model=DEFAULT_MODEL)
            return JSONResponse({"result": response.strip()})

        return JSONResponse({"result": heuristic_route_agent(payload.content, agents)})

    if payload.type == "generate_title":
        if OLLAMA_BASE_URL:
            prompt = f"Generate a short 4-6 word title for this message: {payload.content}"
            response = await ollama_generate(prompt=prompt, system="", model=DEFAULT_MODEL)
            return JSONResponse({"result": response.strip()})

        words = payload.content.strip().split()
        return JSONResponse({"result": " ".join(words[:5])})

    return JSONResponse({"result": ""})


# 1) HUD / general API chat endpoint (Vercel calls this)
@app.post("/api/chat", response_model=OrchestratorResponse)
async def api_chat(req: OrchestratorRequest, x_omega_key: Optional[str] = Header(None)) -> OrchestratorResponse:
    require_api_key(x_omega_key)
    if req.ctx.channel != "hud":
        # Enforce clean channel semantics
        req.ctx.channel = "hud"
    return await route_and_execute(req)


# 2) Telegram webhook endpoint
@app.post("/telegram/webhook")
async def telegram_webhook(request: Request) -> JSONResponse:
    verify_telegram_webhook(request, TELEGRAM_WEBHOOK_SECRET)
    payload = await request.json()

    # Telegram update schema is varied; handle common message path.
    message = payload.get("message") or payload.get("edited_message") or {}
    chat = message.get("chat") or {}
    user = message.get("from") or {}
    text = message.get("text") or ""

    if not text:
        return JSONResponse({"ok": True, "ignored": "no_text"})

    telegram_user_id = str(user.get("id", "unknown"))
    telegram_chat_id = str(chat.get("id", "unknown"))

    # Map Telegram -> internal user/session ids.
    # You can make this deterministic for now.
    user_id = f"tg_{telegram_user_id}"
    session_id = f"tgchat_{telegram_chat_id}"

    oreq = OrchestratorRequest(
        user_id=user_id,
        session_id=session_id,
        ctx=ClientContext(channel="telegram", device="telegram", timezone=None),
        input=InputPayload(text=text, raw=payload),
        permissions={}
    )

    resp = await route_and_execute(oreq)

    # Send back to Telegram
    await telegram_send_message(chat_id=telegram_chat_id, text=resp.text)

    return JSONResponse({"ok": True, "message_id": resp.message_id, "logs_ref": resp.logs_ref})


async def telegram_send_message(chat_id: str, text: str) -> None:
    if not TELEGRAM_BOT_TOKEN:
        # No token configured; fail silently to avoid webhook storms.
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
        await client.post(url, json={"chat_id": chat_id, "text": text})


# 3) Alexa skill endpoint
@app.post("/alexa")
async def alexa_endpoint(payload: Dict[str, Any]) -> JSONResponse:
    """
    Minimal Alexa handler:
    - Expects text already ASR'd by Alexa.
    - Produces an Alexa JSON response.

    In real life you'll parse request types:
      - LaunchRequest
      - IntentRequest
      - SessionEndedRequest
    """
    req_type = payload.get("request", {}).get("type", "")
    session = payload.get("session", {}) or {}
    user = session.get("user", {}) or {}
    alexa_user_id = user.get("userId", "unknown")

    # Extract the spoken text (commonly from intent slots)
    intent = payload.get("request", {}).get("intent", {}) or {}
    slots = intent.get("slots", {}) or {}
    spoken = None
    for s in slots.values():
        if isinstance(s, dict) and s.get("value"):
            spoken = s["value"]
            break

    # Fallback to a raw query field if your skill uses one
    spoken = spoken or payload.get("request", {}).get("query") or ""

    if req_type == "LaunchRequest":
        spoken = spoken or "Hello OmegA."

    # Map to OmegA identity/session
    user_id = f"alexa_{hashlib.sha256(alexa_user_id.encode('utf-8')).hexdigest()[:16]}"
    session_id = f"alexa_{session.get('sessionId', uuid.uuid4().hex)}"

    oreq = OrchestratorRequest(
        user_id=user_id,
        session_id=session_id,
        ctx=ClientContext(channel="alexa", device="echo"),
        input=InputPayload(text=spoken, raw=payload),
        permissions={}
    )

    oresp = await route_and_execute(oreq)

    # Simple Alexa speech response (SSML-ready if you want)
    alexa_resp = {
        "version": "1.0",
        "response": {
            "outputSpeech": {
                "type": "PlainText",
                "text": oresp.text[:800]  # Alexa has practical limits
            },
            "shouldEndSession": True
        }
    }
    return JSONResponse(alexa_resp)


# 4) Tool endpoints (optional inbound tool callbacks)
# Usually tools are CALLED by orchestrator, not calling it.
# But these endpoints exist if you want tools to callback with status.

@app.post("/tools/callback")
async def tools_callback(payload: Dict[str, Any], x_omega_key: Optional[str] = Header(None)) -> JSONResponse:
    require_api_key(x_omega_key)
    # Example: tools can send async completion signals.
    # You can route to job updates here.
    return JSONResponse({"ok": True})


# 5) Job endpoints (workflow / long-running orchestration)

@app.post("/jobs/start", response_model=StartJobResponse)
async def jobs_start(req: StartJobRequest, x_omega_key: Optional[str] = Header(None)) -> StartJobResponse:
    require_api_key(x_omega_key)
    job_id = await supabase.create_job(req.user_id, req.session_id, req.job_type, req.payload)
    await supabase.update_job(job_id, "queued")

    # In a real system you would enqueue this to a worker (n8n, celery, rq, etc.)
    # Here we just acknowledge creation.
    logs_ref = await supabase.write_action_log(req.user_id, req.session_id, {
        "event": "job.created",
        "job_id": job_id,
        "job_type": req.job_type,
        "payload": req.payload,
        "time": time.time()
    })
    return StartJobResponse(job_id=job_id, status="queued", logs_ref=logs_ref)


@app.get("/jobs/status/{job_id}", response_model=JobStatusResponse)
async def jobs_status(job_id: str, x_omega_key: Optional[str] = Header(None)) -> JobStatusResponse:
    require_api_key(x_omega_key)
    data = await supabase.read_job(job_id)
    return JobStatusResponse(
        job_id=job_id,
        status=data.get("status", "queued"),
        result=data.get("result"),
        error=data.get("error"),
        updated_at=float(data.get("updated_at", time.time()))
    )


# -----------------------------------------------------------------------------
# Optional: A single endpoint the Host PC can use to expose "hands/vision/browser"
# -----------------------------------------------------------------------------

@app.post("/tools/hands_proxy")
async def hands_proxy(payload: Dict[str, Any], x_omega_key: Optional[str] = Header(None)) -> JSONResponse:
    """
    Convenience proxy: HUD/Telegram/Alexa should NOT call tools directly.
    They call orchestrator, which calls tools.
    This endpoint is for debugging.
    """
    require_api_key(x_omega_key)
    cmd = payload.get("command", "")
    res = await tool_hands(cmd, cwd=payload.get("cwd"), env=payload.get("env"), timeout_s=payload.get("timeout_s"))
    return JSONResponse(res.model_dump())


@app.post("/tools/browser_proxy")
async def browser_proxy(payload: Dict[str, Any], x_omega_key: Optional[str] = Header(None)) -> JSONResponse:
    """
    DOM-FIRST browser proxy for debugging.
    """
    require_api_key(x_omega_key)
    res = await tool_browser(
        action=payload.get("action", "snapshot"),
        url=payload.get("url"),
        selector=payload.get("selector"),
        text=payload.get("text"),
    )
    return JSONResponse(res.model_dump())


@app.post("/tools/vision_proxy")
async def vision_proxy(payload: Dict[str, Any], x_omega_key: Optional[str] = Header(None)) -> JSONResponse:
    require_api_key(x_omega_key)
    res = await tool_vision(mode=payload.get("mode", "screenshot"), target=payload.get("target"))
    return JSONResponse(res.model_dump())
