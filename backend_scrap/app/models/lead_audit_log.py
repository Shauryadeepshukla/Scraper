from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


class LeadAuditLog(Base):
    __tablename__ = "lead_audit_logs"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    field_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    old_value: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    new_value: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    changed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    lead = relationship(
        "Lead",
        back_populates="audit_logs",
    )

    changed_by_user = relationship(
        "User",
        back_populates="audit_logs",
    )
