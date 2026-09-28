from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.extractions import router as extractions_router
from app.api.leads import router as leads_router
from app.api.sources import router as sources_router
from app.database.connection import Base, engine
import app.models  # noqa: F401 ensure models registered

# Ensure DB tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lead Management System API",
    description="Backend API for lead extraction, user authentication, and field change auditing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(extractions_router)
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