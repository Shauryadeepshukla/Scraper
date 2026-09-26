from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ExtractionCreate(BaseModel):
    source_id: int
    url: str
    duration_minutes: float


class ExtractionResponse(BaseModel):
    id: int
    source_id: int
    url: str
    duration_minutes: float
    started_at: datetime
    completed_at: Optional[datetime]
    status: str
    records_found: int
    records_added: int
    duplicates_found: int
    errors: int
    error_message: Optional[str]
    triggered_by: Optional[int]

    model_config = ConfigDict(
        from_attributes=True
    )

