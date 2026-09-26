from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.extraction_run import ExtractionRun
from app.models.source import Source
from app.schemas.extraction import (
    ExtractionCreate,
    ExtractionResponse,
)
from app.services.extraction_service import run_extraction_job

router = APIRouter(
    prefix="/api/extractions",
    tags=["Extractions"],
)


@router.get(
    "",
    response_model=list[ExtractionResponse],
)
def get_extractions(
    db: Session = Depends(get_db),
):
    return (
        db.query(ExtractionRun)
        .order_by(
            ExtractionRun.started_at.desc()
        )
        .all()
    )


@router.get(
    "/{extraction_id}",
    response_model=ExtractionResponse,
)
def get_extraction(
    extraction_id: int,
    db: Session = Depends(get_db),
):

    extraction = (
        db.query(ExtractionRun)
        .filter(
            ExtractionRun.id == extraction_id
        )
        .first()
    )

    if not extraction:
        raise HTTPException(
            status_code=404,
            detail="Extraction run not found.",
        )

    return extraction


@router.post(
    "",
    response_model=ExtractionResponse,
    status_code=201,
)
def create_extraction(
    extraction_data: ExtractionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):

    source = (
        db.query(Source)
        .filter(
            Source.id == extraction_data.source_id
        )
        .first()
    )

    if not source:
        raise HTTPException(
            status_code=404,
            detail="Source not found.",
        )

    if not source.is_active:
        raise HTTPException(
            status_code=400,
            detail="Source is inactive.",
        )

    extraction = ExtractionRun(
        source_id=source.id,
        url=extraction_data.url,
        duration_minutes=extraction_data.duration_minutes,
        status="PENDING",
        records_found=0,
        records_added=0,
        duplicates_found=0,
        errors=0,
    )

    db.add(extraction)
    db.commit()
    db.refresh(extraction)

    background_tasks.add_task(
        run_extraction_job,
        extraction.id,
    )

    return extraction