from datetime import datetime

def normalize_vercel(payload: dict) -> dict:
    return {
        "id": payload.get("id") or f"evt_{datetime.utcnow().timestamp()}".replace(".", ""),
        "ts": datetime.utcnow().isoformat() + "Z",
        "source": "vercel",
        "type": "deployment",
        "payload": payload,
        "context": {
            "project": payload.get("project", {}).get("name"),
            "environment": payload.get("target") or "private"
        },
        "security": {
            "signature_valid": True,
            "signature_kind": "provider"
        }
    }
