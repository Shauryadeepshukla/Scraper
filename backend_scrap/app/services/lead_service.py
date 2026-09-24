import re

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.lead import Lead


def normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None

    digits = re.sub(r"\D", "", phone)

    # India-specific normalization
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]

    if len(digits) == 10:
        return digits

    return digits or None


def normalize_email(email: str | None) -> str | None:
    if not email:
        return None

    return email.strip().lower()


def normalize_text(value: str | None) -> str | None:
    if not value:
        return None

    value = value.strip().lower()

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value

def find_duplicate_lead(
    db: Session,
    mobile: str | None = None,
    email: str | None = None,
):
    normalized_mobile = normalize_phone(mobile)
    normalized_email = normalize_email(email)

    conditions = []

    if normalized_mobile:
        conditions.append(
            Lead.mobile == normalized_mobile
        )

    if normalized_email:
        conditions.append(
            Lead.email == normalized_email
        )

    if not conditions:
        return None

    return (
        db.query(Lead)
        .filter(or_(*conditions))
        .first()
    )