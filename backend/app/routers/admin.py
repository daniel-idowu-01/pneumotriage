import hmac
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.config import get_settings
from app.db import get_db
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminStatsResponse,
)
from app.security import create_admin_token, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginRequest) -> AdminLoginResponse:
    settings = get_settings()
    if not hmac.compare_digest(body.password, settings.admin_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    return AdminLoginResponse(token=create_admin_token())


@router.get("/stats", response_model=AdminStatsResponse, dependencies=[Depends(require_admin)])
def admin_stats(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
) -> AdminStatsResponse:
    stats = crud.get_admin_stats(db, date_from=date_from, date_to=date_to)
    return AdminStatsResponse(**stats)
