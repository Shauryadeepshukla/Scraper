from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SourceCreate(BaseModel):
    name: str
    source_type: str
    is_active: bool = True


class SourceResponse(BaseModel):
    id: int
    name: str
    source_type: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )