import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db_models import PredictionRecord


def create_prediction_record(
    db: Session,
    *,
    image_reference: str,
    original_filename: str,
    model_prediction: str,
    confidence: float,
    raw_score: float,
    threshold_used: float,
) -> PredictionRecord:
    record = PredictionRecord(
        image_reference=image_reference,
        original_filename=original_filename,
        model_prediction=model_prediction,
        confidence=confidence,
        raw_score=raw_score,
        threshold_used=threshold_used,
        status="pending_review",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_prediction(db: Session, prediction_id: uuid.UUID) -> PredictionRecord | None:
    return db.get(PredictionRecord, prediction_id)


def confirm_prediction(
    db: Session,
    record: PredictionRecord,
    *,
    clinician_decision: str,
    clinician_name: str | None,
    clinician_notes: str | None,
) -> PredictionRecord:
    record.clinician_decision = clinician_decision
    record.clinician_name = clinician_name
    record.clinician_notes = clinician_notes
    record.confirmed_at = datetime.utcnow()
    record.status = "confirmed"
    db.commit()
    db.refresh(record)
    return record


def list_predictions(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    result: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[PredictionRecord], int]:
    query = select(PredictionRecord)

    if date_from is not None:
        query = query.where(PredictionRecord.created_at >= date_from)
    if date_to is not None:
        query = query.where(PredictionRecord.created_at <= date_to)
    if result is not None:
        query = query.where(PredictionRecord.model_prediction == result)
    if status is not None:
        query = query.where(PredictionRecord.status == status)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    query = query.order_by(PredictionRecord.created_at.desc()).limit(limit).offset(offset)
    items = list(db.execute(query).scalars().all())

    return items, total
