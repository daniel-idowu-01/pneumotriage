"""Admin auth: a single shared password gating /admin/*, not a user system.

Clinicians remain name-only (see app/db_models.py). This issues a signed,
stateless, time-limited token on successful login — no session table, no
per-user identity, just "is the bearer someone who knows the admin
password, recently." Good enough for a single-clinic pilot's one admin
page; replace with real auth before this gates anything more sensitive.
"""

import base64
import hashlib
import hmac
import time

from fastapi import Header, HTTPException

from app.config import get_settings

TOKEN_TTL_SECONDS = 12 * 60 * 60  # 12 hours


def _sign(payload: str, secret: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_admin_token() -> str:
    settings = get_settings()
    issued_at = str(int(time.time()))
    signature = _sign(issued_at, settings.secret_key)
    raw = f"{issued_at}:{signature}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _verify_admin_token(token: str) -> bool:
    settings = get_settings()
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        issued_at, signature = raw.split(":", 1)
    except Exception:
        return False

    expected = _sign(issued_at, settings.secret_key)
    if not hmac.compare_digest(expected, signature):
        return False

    return time.time() - int(issued_at) <= TOKEN_TTL_SECONDS


def require_admin(authorization: str | None = Header(default=None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing admin token")

    token = authorization.removeprefix("Bearer ")
    if not _verify_admin_token(token):
        raise HTTPException(status_code=401, detail="Invalid or expired admin token")
