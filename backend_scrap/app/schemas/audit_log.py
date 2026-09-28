from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class LeadAuditLogResponse(BaseModel):
    id: int
    lead_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[int] = None
    changed_by_name: Optional[str] = None
    changed_by_email: Optional[str] = None
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)
