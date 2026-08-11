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


def get_admin_stats(
    db: Session,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> dict:
    """Aggregate the audit log for the admin dashboard.

    Aggregated in Python rather than SQL — simplest thing that works at
    single-clinic pilot volume. Move to a GROUP BY query if this table
    grows past a size where loading it all into memory is a problem.
    """
    query = select(PredictionRecord)
    if date_from is not None:
        query = query.where(PredictionRecord.created_at >= date_from)
    if date_to is not None:
        query = query.where(PredictionRecord.created_at <= date_to)

    records = list(db.execute(query).scalars().all())

    total_predictions = len(records)
    pending_review = sum(1 for r in records if r.status == "pending_review")
    confirmed = sum(1 for r in records if r.status == "confirmed")
    pneumonia_count = sum(1 for r in records if r.model_prediction == "Pneumonia")
    normal_count = total_predictions - pneumonia_count
    override_count = sum(
        1 for r in records if r.clinician_decision is not None and r.clinician_decision != r.model_prediction
    )
    override_rate = override_count / confirmed if confirmed else 0.0

    by_clinician: dict[str, dict] = {}
    for r in records:
        if not r.clinician_name:
            continue
        bucket = by_clinician.setdefault(
            r.clinician_name,
            {
                "total": 0,
                "overrides": 0,
                "pneumonia_count": 0,
                "normal_count": 0,
                "first_active": r.created_at,
                "last_active": r.created_at,
            },
        )
        bucket["total"] += 1
        if r.clinician_decision != r.model_prediction:
            bucket["overrides"] += 1
        if r.model_prediction == "Pneumonia":
            bucket["pneumonia_count"] += 1
        else:
            bucket["normal_count"] += 1
        bucket["first_active"] = min(bucket["first_active"], r.created_at)
        bucket["last_active"] = max(bucket["last_active"], r.created_at)

    by_clinician_list = [
        {"clinician_name": name, **data}
        for name, data in sorted(by_clinician.items(), key=lambda kv: kv[1]["total"], reverse=True)
    ]

    daily: dict[str, dict] = {}
    for r in records:
        day = r.created_at.date().isoformat()
        bucket = daily.setdefault(day, {"pneumonia_count": 0, "normal_count": 0, "total": 0})
        bucket["total"] += 1
        if r.model_prediction == "Pneumonia":
            bucket["pneumonia_count"] += 1
        else:
            bucket["normal_count"] += 1

    daily_list = [{"date": day, **data} for day, data in sorted(daily.items())]

    return {
        "totals": {
            "total_predictions": total_predictions,
            "pending_review": pending_review,
            "confirmed": confirmed,
            "pneumonia_count": pneumonia_count,
            "normal_count": normal_count,
            "override_count": override_count,
            "override_rate": override_rate,
        },
        "by_clinician": by_clinician_list,
        "daily": daily_list,
    }
