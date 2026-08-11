import os
import sys
import time

import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app import security  # noqa: E402


def test_valid_token_round_trips():
    token = security.create_admin_token()
    # require_admin raises on failure and returns None on success
    security.require_admin(authorization=f"Bearer {token}")


def test_missing_header_rejected():
    with pytest.raises(HTTPException) as exc:
        security.require_admin(authorization=None)
    assert exc.value.status_code == 401


def test_malformed_header_rejected():
    with pytest.raises(HTTPException):
        security.require_admin(authorization="not-a-bearer-token")


def test_tampered_token_rejected():
    token = security.create_admin_token()
    tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
    with pytest.raises(HTTPException):
        security.require_admin(authorization=f"Bearer {tampered}")


def test_expired_token_rejected(monkeypatch):
    token = security.create_admin_token()
    future = time.time() + security.TOKEN_TTL_SECONDS + 1
    monkeypatch.setattr(time, "time", lambda: future)
    with pytest.raises(HTTPException):
        security.require_admin(authorization=f"Bearer {token}")
