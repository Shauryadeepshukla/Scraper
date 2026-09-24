from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class LeadStatusHistoryResponse(BaseModel):
    id: int
    lead_id: int
    old_status: Optional[str]
    new_status: str
    changed_by: Optional[int]
    changed_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )