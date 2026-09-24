from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.source import Source
from app.schemas.source import (
    SourceCreate,
    SourceResponse,
)

router = APIRouter(
    prefix="/api/sources",
    tags=["Sources"],
)


@router.post(
    "",
    response_model=SourceResponse,
    status_code=201,
)
def create_source(
    source_data: SourceCreate,
    db: Session = Depends(get_db),
):
    source = Source(
        name=source_data.name,
        source_type=source_data.source_type,
        is_active=source_data.is_active,
    )

    db.add(source)
    db.commit()
    db.refresh(source)

    return source


@router.get(
    "",
    response_model=list[SourceResponse],
)
def get_sources(
    db: Session = Depends(get_db),
):
    return (
        db.query(Source)
        .order_by(Source.name)
        .all()
    )