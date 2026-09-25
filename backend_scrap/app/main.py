from fastapi import FastAPI

from app.api.leads import router as leads_router
from app.api.sources import router as sources_router
from app.api.extractions import (
    router as extractions_router,
)
app = FastAPI(
    title="Lead Management System API",
    description="Backend API for lead extraction and management",
    version="1.0.0",
)


app.include_router(extractions_router
)
app.include_router(leads_router)
app.include_router(sources_router)

@app.get("/")
def root():
    return {
        "message": "Lead Management System API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }