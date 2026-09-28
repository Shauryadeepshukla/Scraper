from datetime import datetime
from typing import Optional

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    lead_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    source_id: Mapped[int] = mapped_column(
        ForeignKey("sources.id"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    mobile: Mapped[Optional[str]] = mapped_column(
        String(30),
        index=True,
        nullable=True,
    )

    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        index=True,
        nullable=True,
    )

    city: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )

    location: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    website: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    google_maps_url: Mapped[Optional[str]] = mapped_column(
        String(1000),
        index=True,
        nullable=True,
    )

    qualification: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    programme_interested: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    institution: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="NEW",
        nullable=False,
        index=True,
    )

    assigned_counsellor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    next_follow_up: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    consent_status: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    source = relationship(
        "Source",
        back_populates="leads",
    )

    assigned_counsellor = relationship(
        "User",
        back_populates="assigned_leads",
    )

    status_history = relationship(
        "LeadStatusHistory",
        back_populates="lead",
        cascade="all, delete-orphan",
    )

    audit_logs = relationship(
        "LeadAuditLog",
        back_populates="lead",
        cascade="all, delete-orphan",
    )