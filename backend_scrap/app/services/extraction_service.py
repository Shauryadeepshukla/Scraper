from datetime import datetime

from app.database.connection import SessionLocal
from app.extractors.google_maps import extract_google_maps
from app.models.extraction_run import ExtractionRun
from app.models.lead import Lead
from app.services.lead_service import (
    find_duplicate_lead,
    generate_lead_id,
    normalize_email,
    normalize_phone,
)


def run_extraction_job(extraction_id: int):
    """
    Executes a background lead extraction job for Google Maps.
    Creates a dedicated database session to track progress and insert leads.
    """
    db = SessionLocal()
    try:
        extraction = (
            db.query(ExtractionRun)
            .filter(ExtractionRun.id == extraction_id)
            .first()
        )

        if not extraction:
            return

        # Change status from PENDING to RUNNING
        extraction.status = "RUNNING"
        extraction.started_at = datetime.utcnow()
        db.commit()

        try:
            results = extract_google_maps(
                url=extraction.url,
                duration_minutes=extraction.duration_minutes,
                headless=True,
            )

            extraction.records_found = len(results)

            for item in results:
                raw_phone = item.get("phone")
                raw_email = item.get("email")
                maps_url = item.get("google_maps_url")

                normalized_mobile = normalize_phone(raw_phone)
                normalized_email = normalize_email(raw_email)

                duplicate = find_duplicate_lead(
                    db=db,
                    mobile=normalized_mobile,
                    email=normalized_email,
                    google_maps_url=maps_url,
                    source_id=extraction.source_id,
                )

                if duplicate:
                    extraction.duplicates_found += 1
                else:
                    lead = Lead(
                        lead_id=generate_lead_id(),
                        source_id=extraction.source_id,
                        name=item.get("name") or "Unknown Listing",
                        mobile=normalized_mobile,
                        email=normalized_email,
                        location=item.get("location"),
                        website=item.get("website"),
                        google_maps_url=maps_url,
                        status="NEW",
                    )
                    db.add(lead)
                    extraction.records_added += 1

            extraction.status = "COMPLETED"
            extraction.completed_at = datetime.utcnow()
            db.commit()

        except Exception as exc:
            db.rollback()
            # Fetch extraction again in case session was invalidated
            extraction = (
                db.query(ExtractionRun)
                .filter(ExtractionRun.id == extraction_id)
                .first()
            )
            if extraction:
                extraction.status = "FAILED"
                extraction.error_message = str(exc)
                extraction.completed_at = datetime.utcnow()
                extraction.errors += 1
                db.commit()

    finally:
        db.close()
