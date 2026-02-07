from datetime import datetime

def normalize_generic(source: str, event_type: str, payload: dict) -> dict:
    return {
        "id": payload.get("id") or f"evt_{datetime.utcnow().timestamp()}".replace(".", ""),
        "ts": datetime.utcnow().isoformat() + "Z",
        "source": source,
        "type": event_type,
        "payload": payload,
        "context": {"project": "omega-trinity", "environment": "private"},
        "security": {"signature_valid": True, "signature_kind": "hmac"}
    }
