import sys
import time
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.connection import SessionLocal
from app.models.source import Source
from app.models.lead import Lead
from app.models.extraction_run import ExtractionRun
from app.services.lead_service import find_duplicate_lead, generate_lead_id
from app.services.extraction_service import run_extraction_job


def test_api_health_and_root():
    print("--- Test 1: Root & Health Endpoints ---", flush=True)
    client = TestClient(app)
    r1 = client.get("/")
    assert r1.status_code == 200, f"Expected 200, got {r1.status_code}"
    assert r1.json()["status"] == "running"

    r2 = client.get("/health")
    assert r2.status_code == 200, f"Expected 200, got {r2.status_code}"
    assert r2.json()["status"] == "healthy"
    print("Test 1 Passed!", flush=True)


def test_sources_api():
    print("--- Test 2: Sources API ---", flush=True)
    client = TestClient(app)
    db: Session = SessionLocal()
    try:
        existing = db.query(Source).filter(Source.source_type == "GOOGLE_MAPS").first()
        if existing:
            print(f"Test 2 Passed! Existing Source ID: {existing.id}", flush=True)
            return existing.id
    finally:
        db.close()

    unique_name = f"Google Maps Test {generate_lead_id()[:4]}"
    res = client.post(
        "/api/sources",
        json={
            "name": unique_name,
            "source_type": "GOOGLE_MAPS",
            "is_active": True,
        },
    )
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    source_id = res.json()["id"]

    # Get sources list
    list_res = client.get("/api/sources")
    assert list_res.status_code == 200
    sources = list_res.json()
    assert any(s["id"] == source_id for s in sources)
    print(f"Test 2 Passed! Source ID: {source_id}", flush=True)
    return source_id


def test_duplicate_detection(source_id: int):
    print("--- Test 3: Duplicate Lead Detection ---", flush=True)
    db: Session = SessionLocal()
    try:
        import time
        unique_suffix = generate_lead_id()
        maps_url = f"https://www.google.com/maps/place/Test+Institute+{unique_suffix}"
        mobile = f"9{int(time.time() * 1000) % 1000000000:09d}"
        email = f"test_{unique_suffix.lower()}@example.com"

        # Check not duplicate initially
        assert find_duplicate_lead(db, mobile=mobile, email=email, google_maps_url=maps_url, source_id=source_id) is None

        # Create lead
        lead = Lead(
            lead_id=unique_suffix,
            source_id=source_id,
            name="Test Institute",
            mobile=mobile,
            email=email,
            location="Delhi, India",
            website="https://testinstitute.com",
            google_maps_url=maps_url,
            status="NEW",
        )
        db.add(lead)
        db.commit()

        # Check mobile duplicate
        dup1 = find_duplicate_lead(db, mobile=mobile)
        assert dup1 is not None and dup1.id == lead.id, "Mobile duplicate check failed"

        # Check email duplicate
        dup2 = find_duplicate_lead(db, email=email.upper())
        assert dup2 is not None and dup2.id == lead.id, "Email duplicate check failed"

        # Check google_maps_url + source_id duplicate
        dup3 = find_duplicate_lead(db, google_maps_url=maps_url, source_id=source_id)
        assert dup3 is not None and dup3.id == lead.id, "Google Maps URL duplicate check failed"

        print("Test 3 Passed!", flush=True)
        return mobile
    finally:
        db.close()


def test_extraction_pipeline(source_id: int, dup_mobile: str):
    print("--- Test 4: Extraction Pipeline & Background Job ---", flush=True)
    suffix = generate_lead_id()
    unique_phone = f"99{int(time.time() * 1000) % 10000000:08d}"
    mock_results = [
        {
            "name": f"Alpha Academy {suffix}",
            "location": "Delhi, India",
            "phone": unique_phone,
            "website": "https://alphaacademy.com",
            "google_maps_url": f"https://www.google.com/maps/place/Alpha+Academy+{suffix}",
        },
        {
            "name": f"Beta Coaching {suffix}",
            "location": "Mumbai, India",
            "phone": dup_mobile,
            "website": "https://betacoaching.com",
            "google_maps_url": f"https://www.google.com/maps/place/Beta+Coaching+{suffix}",
        },
    ]

    with patch("app.services.extraction_service.extract_google_maps", return_value=mock_results):
        client = TestClient(app)
        res = client.post(
            "/api/extractions",
            json={
                "source_id": source_id,
                "url": "https://www.google.com/maps/search/coaching",
                "duration_minutes": 1.0,
            },
        )
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        ext_data = res.json()
        ext_id = ext_data["id"]
        assert ext_data["status"] in ["PENDING", "COMPLETED"]
        print(f"Extraction created: ID {ext_id}, initial status: {ext_data['status']}", flush=True)

    # Check extraction record in DB
    db: Session = SessionLocal()
    try:
        ext_record = db.query(ExtractionRun).filter(ExtractionRun.id == ext_id).first()
        assert ext_record is not None
        print(f"DEBUG: records_found={ext_record.records_found}, records_added={ext_record.records_added}, duplicates_found={ext_record.duplicates_found}, errors={ext_record.errors}, error_msg={ext_record.error_message}, status={ext_record.status}", flush=True)
        assert ext_record.status == "COMPLETED"
        assert ext_record.records_found == 2
        assert ext_record.records_added == 1
        assert ext_record.duplicates_found == 1
        print(f"Extraction Completed OK: records_found={ext_record.records_found}, records_added={ext_record.records_added}, duplicates_found={ext_record.duplicates_found}", flush=True)

        # Verify lead created
        alpha_lead = db.query(Lead).filter(Lead.name == f"Alpha Academy {suffix}").first()
        assert alpha_lead is not None
        assert alpha_lead.mobile == unique_phone
        assert alpha_lead.location == "Delhi, India"
        assert alpha_lead.website == "https://alphaacademy.com"
        assert alpha_lead.google_maps_url == f"https://www.google.com/maps/place/Alpha+Academy+{suffix}"
        print("Lead inserted correctly into DB with all new fields!", flush=True)

    finally:
        db.close()
    print("Test 4 Passed!", flush=True)


def test_leads_api():
    print("--- Test 5: Leads GET / Search API ---", flush=True)
    client = TestClient(app)
    res = client.get("/api/leads?search=Alpha")
    assert res.status_code == 200
    leads = res.json()
    assert len(leads) > 0
    assert "Alpha" in leads[0]["name"]
    assert "location" in leads[0]
    assert "website" in leads[0]
    assert "google_maps_url" in leads[0]
    print(f"Test 5 Passed! Found lead: {leads[0]['name']}", flush=True)


def test_export_leads_api():
    print("--- Test 6: Export Leads to Excel API ---", flush=True)
    client = TestClient(app)
    res = client.get("/api/leads/export")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(res.content) > 0
    print("Test 6 Passed! Excel file generated successfully", flush=True)


if __name__ == "__main__":
    test_api_health_and_root()
    sid = test_sources_api()
    dup_mob = test_duplicate_detection(sid)
    test_extraction_pipeline(sid, dup_mob)
    test_leads_api()
    test_export_leads_api()
    print("\n==========================================")
    print("ALL BACKEND PIPELINE TESTS PASSED 100%!")
    print("==========================================")
