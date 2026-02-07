from datetime import datetime

def normalize_github(event_type: str, payload: dict) -> dict:
    repo = payload.get("repository", {})
    return {
        "id": payload.get("after") or payload.get("pull_request", {}).get("id") or f"evt_{datetime.utcnow().timestamp()}".replace(".", ""),
        "ts": datetime.utcnow().isoformat() + "Z",
        "source": "github",
        "type": event_type,
        "payload": payload,
        "context": {
            "repo": repo.get("full_name"),
            "ref": payload.get("ref"),
            "sha": payload.get("after"),
            "project": "omega-trinity",
            "environment": "private"
        },
        "security": {
            "signature_valid": True,
            "signature_kind": "hmac"
        }
    }
