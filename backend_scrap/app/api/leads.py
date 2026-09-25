import io
from typing import Optional
import pandas as pd

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.lead import Lead
from app.models.lead_status_history import LeadStatusHistory
from app.schemas.lead import (
    LeadCreate,
    LeadResponse,
    LeadUpdate,
)
from app.services.lead_service import (
    find_duplicate_lead,
    generate_lead_id,
    normalize_email,
    normalize_phone,
)

router = APIRouter(
    prefix="/api/leads",
    tags=["Leads"],
)


@router.post(
    "",
    response_model=LeadResponse,
    status_code=201,
)
def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
):
    normalized_mobile = normalize_phone(
        lead_data.mobile
    )

    normalized_email = normalize_email(
        lead_data.email
    )

    duplicate = find_duplicate_lead(
        db=db,
        mobile=normalized_mobile,
        email=normalized_email,
        google_maps_url=lead_data.google_maps_url,
        source_id=lead_data.source_id,
    )

    if duplicate:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Duplicate lead detected",
                "lead_id": duplicate.lead_id,
                "database_id": duplicate.id,
            },
        )

    lead = Lead(
        lead_id=generate_lead_id(),
        source_id=lead_data.source_id,
        name=lead_data.name,
        mobile=normalized_mobile,
        email=normalized_email,
        city=lead_data.city,
        location=lead_data.location,
        website=lead_data.website,
        google_maps_url=lead_data.google_maps_url,
        qualification=lead_data.qualification,
        programme_interested=lead_data.programme_interested,
        institution=lead_data.institution,
        status=lead_data.status,
        assigned_counsellor_id=lead_data.assigned_counsellor_id,
        next_follow_up=lead_data.next_follow_up,
        notes=lead_data.notes,
        consent_status=lead_data.consent_status,
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead
@router.get(
    "",
    response_model=list[LeadResponse],
)
@router.get(
    "",
    response_model=list[LeadResponse],
)
def get_leads(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    assigned_counsellor_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    # General search
    if search:
        search_value = f"%{search}%"

        query = query.filter(
            or_(
                Lead.name.ilike(search_value),
                Lead.mobile.ilike(search_value),
                Lead.email.ilike(search_value),
                Lead.institution.ilike(search_value),
                Lead.city.ilike(search_value),
            )
        )

    # Status filter
    if status:
        query = query.filter(
            Lead.status == status.upper()
        )

    # City filter
    if city:
        query = query.filter(
            Lead.city.ilike(f"%{city}%")
        )

    # Source filter
    if source_id:
        query = query.filter(
            Lead.source_id == source_id
        )

    # Counsellor filter
    if assigned_counsellor_id:
        query = query.filter(
            Lead.assigned_counsellor_id
            == assigned_counsellor_id
        )

    # Pagination
    offset = (page - 1) * limit

    leads = (
        query
        .order_by(Lead.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return leads


@router.get(
    "/export",
)
def export_leads(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    assigned_counsellor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    if search:
        search_value = f"%{search}%"
        query = query.filter(
            or_(
                Lead.name.ilike(search_value),
                Lead.mobile.ilike(search_value),
                Lead.email.ilike(search_value),
                Lead.institution.ilike(search_value),
                Lead.city.ilike(search_value),
            )
        )

    if status:
        query = query.filter(
            Lead.status == status.upper()
        )

    if city:
        query = query.filter(
            Lead.city.ilike(f"%{city}%")
        )

    if source_id:
        query = query.filter(
            Lead.source_id == source_id
        )

    if assigned_counsellor_id:
        query = query.filter(
            Lead.assigned_counsellor_id == assigned_counsellor_id
        )

    leads = query.order_by(Lead.created_at.desc()).all()

    data = []
    for lead in leads:
        data.append({
            "Lead ID": lead.lead_id,
            "Name": lead.name,
            "Mobile": lead.mobile,
            "Email": lead.email,
            "City": lead.city,
            "Location": lead.location,
            "Website": lead.website,
            "Google Maps URL": lead.google_maps_url,
            "Qualification": lead.qualification,
            "Programme Interested": lead.programme_interested,
            "Institution": lead.institution,
            "Status": lead.status,
            "Assigned Counsellor ID": lead.assigned_counsellor_id,
            "Next Follow Up": lead.next_follow_up.strftime("%Y-%m-%d %H:%M:%S") if lead.next_follow_up else "",
            "Notes": lead.notes,
            "Consent Status": lead.consent_status,
            "Created At": lead.created_at.strftime("%Y-%m-%d %H:%M:%S") if lead.created_at else "",
        })

    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Leads")
    output.seek(0)

    headers = {
        "Content-Disposition": 'attachment; filename="leads_export.xlsx"'
    }
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )

@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    return lead

@router.put(
    "/{lead_id}",
    response_model=LeadResponse,
)
def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    update_data = lead_data.model_dump(
        exclude_unset=True
    )

    # Track status change
    if "status" in update_data:
        new_status = update_data["status"]

        if new_status != lead.status:
            history = LeadStatusHistory(
                lead_id=lead.id,
                old_status=lead.status,
                new_status=new_status,
                changed_by=None,
            )

            db.add(history)

    # Apply updates
    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)

    return lead


@router.get(
    "/{lead_id}/history",
)
def get_lead_history(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    history = (
        db.query(LeadStatusHistory)
        .filter(
            LeadStatusHistory.lead_id == lead_id
        )
        .order_by(
            LeadStatusHistory.changed_at.desc()
        )
        .all()
    )

    return history

@router.delete(
    "/{lead_id}",
)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    db.delete(lead)
    db.commit()

    return {
        "message": "Lead deleted successfully"
    }