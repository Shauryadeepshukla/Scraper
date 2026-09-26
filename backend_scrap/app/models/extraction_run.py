from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base

class ExtractionRun(Base):
    __tablename__ = "extraction_runs"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    source_id: Mapped[int] = mapped_column(
        ForeignKey("sources.id"),
        nullable=False,
        index=True,
    )

    url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    duration_minutes: Mapped[float] = mapped_column(
        nullable=False,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    completed_at: Mapped[Optional[datetime]] = (
        mapped_column(
            DateTime,
            nullable=True,
        )
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="PENDING",
        nullable=False,
    )

    records_found: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    records_added: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    duplicates_found: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    errors: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    error_message: Mapped[Optional[str]] = (
        mapped_column(
            Text,
            nullable=True,
        )
    )

    triggered_by: Mapped[Optional[int]] = (
        mapped_column(
            ForeignKey("users.id"),
            nullable=True,
        )
    )

    source = relationship(
        "Source",
        back_populates="extraction_runs",
    )

    triggered_by_user = relationship(
        "User",
        back_populates="extraction_runs",
    )