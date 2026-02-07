import json
import os
from fastapi import FastAPI, Header, Request, HTTPException
from .queue import init_db, enqueue, is_duplicate, record_idempotency
from .normalize.github import normalize_github
from .normalize.vercel import normalize_vercel
from .normalize.generic import normalize_generic
from .verify.github import verify_github
from .verify.generic_hmac import verify_hmac
from .verify.vercel import verify_vercel

app = FastAPI()
init_db()

GITHUB_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")
VERCEL_SECRET = os.getenv("VERCEL_WEBHOOK_SECRET", "")
GENERIC_SECRET = os.getenv("GENERIC_WEBHOOK_SECRET", "")

async def _read_json(request: Request) -> dict:
    try:
        return await request.json()
    except Exception:
        return {}

def _drop_if_duplicate(idempotency_key: str):
    if idempotency_key and is_duplicate(idempotency_key):
        raise HTTPException(status_code=200, detail="Duplicate dropped")

@app.post("/hook/github/push")
async def hook_github_push(request: Request, x_hub_signature_256: str | None = Header(default=None), x_idempotency_key: str | None = Header(default=None)):
    body = await request.body()
    if not verify_github(GITHUB_SECRET, body, x_hub_signature_256 or ""):
        raise HTTPException(status_code=401, detail="Invalid GitHub signature")
    _drop_if_duplicate(x_idempotency_key or "")
    payload = json.loads(body.decode("utf-8"))
    event = normalize_github("push", payload)
    enqueue(event["id"], event["ts"], event["source"], event["type"], json.dumps(event))
    record_idempotency(x_idempotency_key or "", event["id"], event["ts"])
    return {"status": "ok", "id": event["id"]}

@app.post("/hook/github/pull_request")
async def hook_github_pr(request: Request, x_hub_signature_256: str | None = Header(default=None), x_idempotency_key: str | None = Header(default=None)):
    body = await request.body()
    if not verify_github(GITHUB_SECRET, body, x_hub_signature_256 or ""):
        raise HTTPException(status_code=401, detail="Invalid GitHub signature")
    _drop_if_duplicate(x_idempotency_key or "")
    payload = json.loads(body.decode("utf-8"))
    event = normalize_github("pull_request", payload)
    enqueue(event["id"], event["ts"], event["source"], event["type"], json.dumps(event))
    record_idempotency(x_idempotency_key or "", event["id"], event["ts"])
    return {"status": "ok", "id": event["id"]}

@app.post("/hook/vercel/deployment")
async def hook_vercel(request: Request, x_vercel_signature: str | None = Header(default=None), x_idempotency_key: str | None = Header(default=None)):
    body = await request.body()
    if not verify_vercel(VERCEL_SECRET, body, x_vercel_signature or ""):
        raise HTTPException(status_code=401, detail="Invalid Vercel signature")
    _drop_if_duplicate(x_idempotency_key or "")
    payload = json.loads(body.decode("utf-8"))
    event = normalize_vercel(payload)
    enqueue(event["id"], event["ts"], event["source"], event["type"], json.dumps(event))
    record_idempotency(x_idempotency_key or "", event["id"], event["ts"])
    return {"status": "ok", "id": event["id"]}

@app.post("/hook/n8n/intake")
async def hook_n8n(request: Request, x_omega_signature: str | None = Header(default=None), x_idempotency_key: str | None = Header(default=None)):
    body = await request.body()
    if not verify_hmac(GENERIC_SECRET, body, x_omega_signature or ""):
        raise HTTPException(status_code=401, detail="Invalid signature")
    _drop_if_duplicate(x_idempotency_key or "")
    payload = json.loads(body.decode("utf-8"))
    event = normalize_generic("n8n", payload.get("type", "intent"), payload)
    enqueue(event["id"], event["ts"], event["source"], event["type"], json.dumps(event))
    record_idempotency(x_idempotency_key or "", event["id"], event["ts"])
    return {"status": "ok", "id": event["id"]}

@app.post("/hook/zapier/intake")
async def hook_zapier(request: Request, x_omega_signature: str | None = Header(default=None), x_idempotency_key: str | None = Header(default=None)):
    body = await request.body()
    if not verify_hmac(GENERIC_SECRET, body, x_omega_signature or ""):
        raise HTTPException(status_code=401, detail="Invalid signature")
    _drop_if_duplicate(x_idempotency_key or "")
    payload = json.loads(body.decode("utf-8"))
    event = normalize_generic("zapier", payload.get("type", "intent"), payload)
    enqueue(event["id"], event["ts"], event["source"], event["type"], json.dumps(event))
    record_idempotency(x_idempotency_key or "", event["id"], event["ts"])
    return {"status": "ok", "id": event["id"]}

@app.post("/hook/generic")
async def hook_generic(request: Request, x_idempotency_key: str | None = Header(default=None)):
    payload = await _read_json(request)
    _drop_if_duplicate(x_idempotency_key or "")
    event = normalize_generic(payload.get("source", "manual"), payload.get("type", "intent"), payload)
    enqueue(event["id"], event["ts"], event["source"], event["type"], json.dumps(event))
    record_idempotency(x_idempotency_key or "", event["id"], event["ts"])
    return {"status": "ok", "id": event["id"]}
