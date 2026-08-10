import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Verdict = Literal["Pneumonia", "Normal"]


class PredictionResponse(BaseModel):
    id: uuid.UUID
    prediction: Verdict
    confidence: float
    threshold_used: float
    raw_score: float
    status: Literal["pending_review", "confirmed"]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConfirmRequest(BaseModel):
    clinician_decision: Verdict
    clinician_name: str | None = Field(default=None, max_length=200)
    clinician_notes: str | None = Field(default=None, max_length=2000)


class PredictionRecordOut(BaseModel):
    id: uuid.UUID
    created_at: datetime
    original_filename: str
    model_prediction: Verdict
    confidence: float
    raw_score: float
    threshold_used: float
    status: Literal["pending_review", "confirmed"]
    clinician_name: str | None
    clinician_decision: Verdict | None
    clinician_notes: str | None
    confirmed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PredictionListResponse(BaseModel):
    items: list[PredictionRecordOut]
    total: int


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    model_loaded: bool
