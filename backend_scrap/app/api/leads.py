import io
from typing import Any, Dict, List, Optional
import pandas as pd

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.auth_deps import (
    get_current_user,
    get_optional_current_user,
    require_admin,
)
from app.database.connection import get_db
from app.models.lead import Lead
from app.models.lead_status_history import LeadStatusHistory
from app.models.lead_audit_log import LeadAuditLog
from app.models.user import User
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


class PaginatedLeadsResponse(BaseModel):
    items: List[LeadResponse]
    total: int
    page: int
    limit: int
    total_pages: int

    model_config = {"from_attributes": True}


class BulkAssignRequest(BaseModel):
    lead_ids: List[int]
    counsellor_id: Optional[int] = None  # None = unassign

router = APIRouter(
    prefix="/api/leads",
    tags=["Leads"],
)

# ─── Counsellor-allowed update fields (UI-only safety mirror) ────────────────
COUNSELLOR_EDITABLE_FIELDS = {"notes", "status", "next_follow_up"}


def _apply_counsellor_restrictions(update_data: dict, current_user: User) -> dict:
    """Strip fields a Counsellor is not allowed to modify."""
    if current_user.role == "COUNSELLOR":
        return {k: v for k, v in update_data.items() if k in COUNSELLOR_EDITABLE_FIELDS}
    return update_data


# ─── Create Lead (Admin only) ─────────────────────────────────────────────────
@router.post(
    "",
    response_model=LeadResponse,
    status_code=201,
)
def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    normalized_mobile = normalize_phone(lead_data.mobile)
    normalized_email = normalize_email(lead_data.email)

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


# ─── List Leads (Auth required, Counsellor only sees assigned leads) ──────────
@router.get(
    "",
    response_model=PaginatedLeadsResponse,
)
def get_leads(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    assigned_counsellor_id: Optional[int] = Query(None),
    programme_interested: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Lead)

    # ── Role-based visibility ──────────────────────────────────────────────
    if current_user.role == "COUNSELLOR":
        query = query.filter(Lead.assigned_counsellor_id == current_user.id)
    elif assigned_counsellor_id:
        query = query.filter(Lead.assigned_counsellor_id == assigned_counsellor_id)

    # ── Filters ───────────────────────────────────────────────────────────
    if search:
        search_value = f"%{search}%"
        query = query.filter(
            or_(
                Lead.name.ilike(search_value),
                Lead.mobile.ilike(search_value),
                Lead.email.ilike(search_value),
                Lead.institution.ilike(search_value),
                Lead.city.ilike(search_value),
                Lead.programme_interested.ilike(search_value),
            )
        )

    if status:
        query = query.filter(Lead.status == status.upper())
    if city:
        query = query.filter(Lead.city.ilike(f"%{city}%"))
    if source_id:
        query = query.filter(Lead.source_id == source_id)
    if programme_interested:
        query = query.filter(Lead.programme_interested.ilike(f"%{programme_interested}%"))

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)

    offset = (page - 1) * limit
    items = (
        query
        .order_by(Lead.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }


# ─── Export (Admin only) ──────────────────────────────────────────────────────
@router.get("/export")
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
        query = query.filter(Lead.status == status.upper())
    if city:
        query = query.filter(Lead.city.ilike(f"%{city}%"))
    if source_id:
        query = query.filter(Lead.source_id == source_id)
    if assigned_counsellor_id:
        query = query.filter(Lead.assigned_counsellor_id == assigned_counsellor_id)

    leads = query.order_by(Lead.created_at.desc()).all()

    data = []
    for lead in leads:
        counsellor_name = lead.assigned_counsellor.name if lead.assigned_counsellor else ""
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
            "Assigned Counsellor": counsellor_name,
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

    headers = {"Content-Disposition": 'attachment; filename="leads_export.xlsx"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


# ─── Get Single Lead (Auth required, Counsellor restricted to assigned) ───────
@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Counsellors can only access their own assigned leads
    if current_user.role == "COUNSELLOR" and lead.assigned_counsellor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this lead",
        )

    return lead


# ─── Update Lead (Auth required; Counsellor field restrictions enforced) ──────
@router.put(
    "/{lead_id}",
    response_model=LeadResponse,
)
def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Counsellors can only edit their own assigned leads
    if current_user.role == "COUNSELLOR" and lead.assigned_counsellor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this lead",
        )

    update_data = lead_data.model_dump(exclude_unset=True)

    # Strip non-allowed fields for Counsellors
    update_data = _apply_counsellor_restrictions(update_data, current_user)

    # ── Field-level audit logging (who changed what) ──────────────────────
    for field, new_value in update_data.items():
        old_val_raw = getattr(lead, field, None)
        old_str = str(old_val_raw) if old_val_raw is not None else ""
        new_str = str(new_value) if new_value is not None else ""

        if old_str != new_str:
            db.add(LeadAuditLog(
                lead_id=lead.id,
                field_name=field,
                old_value=old_str if old_val_raw is not None else None,
                new_value=new_str if new_value is not None else None,
                changed_by=current_user.id,
            ))

            if field == "status":
                db.add(LeadStatusHistory(
                    lead_id=lead.id,
                    old_status=old_str or None,
                    new_status=new_str,
                    changed_by=current_user.id,
                ))

    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)

    return lead


# ─── Assign Lead (Admin only) ─────────────────────────────────────────────────
@router.put(
    "/{lead_id}/assign",
    response_model=LeadResponse,
)
def assign_lead(
    lead_id: int,
    counsellor_id: Optional[int] = Query(None, description="Counsellor user ID to assign (None to unassign)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if counsellor_id is not None:
        counsellor = db.query(User).filter(
            User.id == counsellor_id,
            User.is_active.is_(True),
        ).first()
        if not counsellor:
            raise HTTPException(status_code=404, detail="Counsellor not found")

    old_counsellor_id = lead.assigned_counsellor_id

    if old_counsellor_id != counsellor_id:
        db.add(LeadAuditLog(
            lead_id=lead.id,
            field_name="assigned_counsellor_id",
            old_value=str(old_counsellor_id) if old_counsellor_id is not None else None,
            new_value=str(counsellor_id) if counsellor_id is not None else None,
            changed_by=current_user.id,
        ))

    lead.assigned_counsellor_id = counsellor_id

    db.commit()
    db.refresh(lead)

    return lead


# ─── Field Audit History (Admin only) ────────────────────────────────────────
@router.get("/{lead_id}/history")
def get_lead_history(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    audit_logs = (
        db.query(LeadAuditLog)
        .filter(LeadAuditLog.lead_id == lead_id)
        .order_by(LeadAuditLog.changed_at.desc())
        .all()
    )

    results = []
    for log in audit_logs:
        u = log.changed_by_user
        results.append({
            "id": log.id,
            "lead_id": log.lead_id,
            "field_name": log.field_name,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "changed_by": log.changed_by,
            "changed_by_name": u.name if u else "System",
            "changed_by_email": u.email if u else None,
            "changed_at": log.changed_at.isoformat() if log.changed_at else None,
        })

    # Fallback: legacy status-only history
    if not results:
        for h in (
            db.query(LeadStatusHistory)
            .filter(LeadStatusHistory.lead_id == lead_id)
            .order_by(LeadStatusHistory.changed_at.desc())
            .all()
        ):
            u = h.changed_by_user
            results.append({
                "id": h.id,
                "lead_id": h.lead_id,
                "field_name": "status",
                "old_value": h.old_status,
                "new_value": h.new_status,
                "changed_by": h.changed_by,
                "changed_by_name": u.name if u else "System",
                "changed_by_email": u.email if u else None,
                "changed_at": h.changed_at.isoformat() if h.changed_at else None,
            })

    return results


# ─── Status History for Counsellor's lead ────────────────────────────────────
@router.get("/{lead_id}/status-history")
def get_lead_status_history(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if current_user.role == "COUNSELLOR" and lead.assigned_counsellor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this lead's history",
        )

    history = (
        db.query(LeadStatusHistory)
        .filter(LeadStatusHistory.lead_id == lead_id)
        .order_by(LeadStatusHistory.changed_at.desc())
        .all()
    )

    results = []
    for h in history:
        u = h.changed_by_user
        results.append({
            "id": h.id,
            "lead_id": h.lead_id,
            "field_name": "status",
            "old_value": h.old_status,
            "new_value": h.new_status,
            "changed_by_name": u.name if u else "System",
            "changed_at": h.changed_at.isoformat() if h.changed_at else None,
        })

    return results


# ─── Bulk Assign Leads (Admin only) ──────────────────────────────────────────
@router.post("/bulk-assign")
def bulk_assign_leads(
    payload: BulkAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Assign (or unassign) a list of leads to a counsellor in one action."""
    if not payload.lead_ids:
        raise HTTPException(status_code=422, detail="lead_ids must not be empty")

    counsellor = None
    if payload.counsellor_id is not None:
        counsellor = db.query(User).filter(
            User.id == payload.counsellor_id,
            User.is_active.is_(True),
        ).first()
        if not counsellor:
            raise HTTPException(status_code=404, detail="Counsellor not found")

    updated = 0
    for lead_id in payload.lead_ids:
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            continue

        old_id = lead.assigned_counsellor_id
        new_id = payload.counsellor_id

        if old_id != new_id:
            db.add(LeadAuditLog(
                lead_id=lead.id,
                field_name="assigned_counsellor_id",
                old_value=str(old_id) if old_id is not None else None,
                new_value=str(new_id) if new_id is not None else None,
                changed_by=current_user.id,
            ))
            lead.assigned_counsellor_id = new_id

        updated += 1

    db.commit()

    counsellor_name = counsellor.name if counsellor else "Unassigned"
    return {
        "message": f"Updated {updated} lead(s) → {counsellor_name}",
        "updated_count": updated,
        "counsellor_id": payload.counsellor_id,
        "counsellor_name": counsellor_name,
    }


# ─── Delete Lead (Admin only) ─────────────────────────────────────────────────
@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()

    return {"message": "Lead deleted successfully"}