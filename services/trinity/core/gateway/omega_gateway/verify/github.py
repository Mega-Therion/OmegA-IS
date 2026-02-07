import hmac
import hashlib

def verify_github(secret: str, body: bytes, signature: str) -> bool:
    if not secret or not signature:
        return False
    sha_name, sig = signature.split("=", 1) if "=" in signature else ("sha256", signature)
    if sha_name != "sha256":
        return False
    mac = hmac.new(secret.encode("utf-8"), body, hashlib.sha256)
    expected = mac.hexdigest()
    return hmac.compare_digest(expected, sig)
