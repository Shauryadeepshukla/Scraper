from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class LeadBase(BaseModel):
    name: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    qualification: Optional[str] = None
    programme_interested: Optional[str] = None
    institution: Optional[str] = None
    status: str = "NEW"
    assigned_counsellor_id: Optional[int] = None
    next_follow_up: Optional[datetime] = None
    notes: Optional[str] = None
    consent_status: Optional[str] = None


class LeadCreate(LeadBase):
    source_id: int


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    qualification: Optional[str] = None
    programme_interested: Optional[str] = None
    institution: Optional[str] = None
    status: Optional[str] = None
    assigned_counsellor_id: Optional[int] = None
    next_follow_up: Optional[datetime] = None
    notes: Optional[str] = None
    consent_status: Optional[str] = None


class LeadResponse(LeadBase):
    id: int
    lead_id: str
    source_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )