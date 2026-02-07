"""Resonance middleware skeleton for basic header validation."""

import json
from typing import Dict, Optional

REQUIRED_HEADERS = (
    "x-resonance-authority",
    "x-resonance-consent",
    "x-resonance-trace",
)


def validate_resonance_headers(headers: Dict[str, str]) -> Optional[Dict[str, str]]:
    missing = [header for header in REQUIRED_HEADERS if header not in headers]
    if missing:
        return {"error": "missing_resonance_headers", "missing": missing}

    return {
        "authority": headers.get("x-resonance-authority"),
        "consent": headers.get("x-resonance-consent"),
        "trace": headers.get("x-resonance-trace"),
    }


class ResonanceMiddleware:
    """ASGI middleware placeholder that validates Resonance headers."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        raw_headers = scope.get("headers", [])
        headers = {
            key.decode("latin-1"): value.decode("latin-1")
            for key, value in raw_headers
        }

        validation = validate_resonance_headers(headers)
        if validation and "error" in validation:
            payload = {
                "error": "missing_resonance_headers",
                "missing": validation.get("missing", []),
            }
            body = json.dumps(payload).encode("utf-8")
            await send(
                {
                    "type": "http.response.start",
                    "status": 400,
                    "headers": [(b"content-type", b"application/json")],
                }
            )
            await send({"type": "http.response.body", "body": body})
            return

        scope["resonance"] = validation
        await self.app(scope, receive, send)
