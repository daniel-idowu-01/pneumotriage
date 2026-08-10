import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud
from app.db import get_db
from app.schemas import ConfirmRequest, PredictionListResponse, PredictionRecordOut

router = APIRouter()


@router.get("/predictions", response_model=PredictionListResponse)
def list_predictions(
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    result: Literal["Pneumonia", "Normal"] | None = None,
    status: Literal["pending_review", "confirmed"] | None = None,
    limit: int = Query(default=50, le=200, gt=0),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> PredictionListResponse:
    items, total = crud.list_predictions(
        db,
        date_from=date_from,
        date_to=date_to,
        result=result,
        status=status,
        limit=limit,
        offset=offset,
    )
    return PredictionListResponse(items=items, total=total)


@router.get("/predictions/{prediction_id}", response_model=PredictionRecordOut)
def get_prediction(prediction_id: uuid.UUID, db: Session = Depends(get_db)) -> PredictionRecordOut:
    record = crud.get_prediction(db, prediction_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return record


@router.post("/predictions/{prediction_id}/confirm", response_model=PredictionRecordOut)
def confirm_prediction(
    prediction_id: uuid.UUID, body: ConfirmRequest, db: Session = Depends(get_db)
) -> PredictionRecordOut:
    record = crud.get_prediction(db, prediction_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Prediction not found")

    return crud.confirm_prediction(
        db,
        record,
        clinician_decision=body.clinician_decision,
        clinician_name=body.clinician_name,
        clinician_notes=body.clinician_notes,
    )
