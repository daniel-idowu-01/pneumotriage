import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class PredictionRecord(Base):
    """One model prediction and its eventual clinician disposition.

    A row is created the moment /predict runs, with status="pending_review"
    and no clinician fields set. It only becomes "confirmed" once a
    clinician records their final call via /predictions/{id}/confirm — the
    model's output alone never counts as a final result. This mandatory
    second step is the audit trail for the human-in-the-loop requirement
    described in docs/intended-use.md.
    """

    __tablename__ = "prediction_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    image_reference: Mapped[str] = mapped_column(String, nullable=False)
    original_filename: Mapped[str] = mapped_column(String, nullable=False)

    model_prediction: Mapped[str] = mapped_column(String, nullable=False)  # "Pneumonia" | "Normal"
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    raw_score: Mapped[float] = mapped_column(Float, nullable=False)
    threshold_used: Mapped[float] = mapped_column(Float, nullable=False)

    status: Mapped[str] = mapped_column(String, nullable=False, default="pending_review")  # | "confirmed"

    # Nullable: single-clinic pilot has no auth yet. A free-text name is
    # collected client-side so the audit trail isn't anonymous even before
    # real accounts exist; wiring this to a `clinicians` table + auth later
    # only requires adding a FK column, not restructuring this table.
    clinician_name: Mapped[str | None] = mapped_column(String, nullable=True)
    clinician_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("clinicians.id"), nullable=True
    )
    clinician_decision: Mapped[str | None] = mapped_column(String, nullable=True)  # "Pneumonia" | "Normal"
    clinician_notes: Mapped[str | None] = mapped_column(String, nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    clinician: Mapped["Clinician | None"] = relationship(back_populates="predictions")


class Clinician(Base):
    """Placeholder identity table.

    Not used for authentication in v1 (no login flow yet) — predictions
    currently store `clinician_name` as free text. This table exists so
    that adding real auth later is a matter of populating it and wiring a
    FK, rather than a schema rewrite.
    """

    __tablename__ = "clinicians"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    predictions: Mapped[list["PredictionRecord"]] = relationship(back_populates="clinician")
