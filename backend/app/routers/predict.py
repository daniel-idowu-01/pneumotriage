import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import crud, inference
from app.config import get_settings
from app.db import get_db
from app.schemas import PredictionResponse

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}


@router.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile, db: Session = Depends(get_db)) -> PredictionResponse:
    settings = get_settings()

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Upload a JPEG or PNG image.",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_size_bytes // (1024 * 1024)} MB upload limit.",
        )

    try:
        result = inference.predict(raw_bytes)
    except inference.InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix or ".jpg"
    stored_filename = f"{uuid.uuid4()}{suffix}"
    (upload_dir / stored_filename).write_bytes(raw_bytes)

    record = crud.create_prediction_record(
        db,
        image_reference=stored_filename,
        original_filename=file.filename or stored_filename,
        model_prediction=result["prediction"],
        confidence=result["confidence"],
        raw_score=result["raw_score"],
        threshold_used=result["threshold_used"],
    )

    logger.info(
        "prediction id=%s result=%s raw_score=%.4f",
        record.id,
        record.model_prediction,
        record.raw_score,
    )

    return PredictionResponse(
        id=record.id,
        prediction=record.model_prediction,
        confidence=record.confidence,
        threshold_used=record.threshold_used,
        raw_score=record.raw_score,
        status=record.status,
        created_at=record.created_at,
    )
