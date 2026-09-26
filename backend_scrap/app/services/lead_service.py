import re
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.lead import Lead


def generate_lead_id() -> str:
    return f"LD-{uuid4().hex[:8].upper()}"


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
    google_maps_url: str | None = None,
    source_id: int | None = None,
) -> Lead | None:
    normalized_mobile = normalize_phone(mobile)
    normalized_email = normalize_email(email)

    # First check: mobile
    if normalized_mobile:
        lead = db.query(Lead).filter(Lead.mobile == normalized_mobile).first()
        if lead:
            return lead

    # Then check: email
    if normalized_email:
        lead = db.query(Lead).filter(Lead.email == normalized_email).first()
        if lead:
            return lead

    # For Google Maps: source_id + google_maps_url
    if google_maps_url and source_id:
        google_maps_url_clean = google_maps_url.strip()
        if google_maps_url_clean:
            lead = (
                db.query(Lead)
                .filter(
                    Lead.source_id == source_id,
                    Lead.google_maps_url == google_maps_url_clean,
                )
                .first()
            )
            if lead:
                return lead

    return None