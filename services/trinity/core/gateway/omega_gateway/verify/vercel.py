# Placeholder: Vercel provides signature headers if configured.
# Implement when Vercel signing secret is added.

def verify_vercel(secret: str, body: bytes, signature: str) -> bool:
    if not secret or not signature:
        return False
    # TODO: implement Vercel signature scheme
    return True
