"""
VectorNet Cyber Command & Compliance Engine
============================================
Smart India Hackathon 2026 | Problem Statement 26155 (NTRO / NCIIPC)
Main Application Entry Point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Core Routers
from backend.app.api.ai_router import router as ai_router
from backend.app.api.audit_router import router as audit_router
from backend.app.api.inventory_router import router as inventory_router
from backend.app.api.report_router import router as report_router
from backend.app.api.task_router import router as task_router

# Shared Engine Singletons (for backward compatibility & direct import)
from backend.app.engines.llm_engine import ai_engine
from backend.app.engines.orchestrator import audit_orchestrator
from backend.app.engines.vector_store import vector_store
from backend.app.services.firestore_service import firestore_store
from backend.app.services.skills_service import skills_engine
from backend.app.services.telemetry_service import inventory_engine, log_aggregator_engine

app = FastAPI(
    title="VectorNet Agentic Compliance & Workflow Engine API",
    description="Defense-Grade Network Configuration Compliance Auditor for SIH 2026 (PS 26155)",
    version="2.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Health Check Endpoint
@app.get("/")
def health_check():
    """Returns platform operational health status and active capabilities."""
    return {
        "status": "ONLINE",
        "service": "VectorNet Agentic Cyber Command API Engine (SIH 26155)",
        "version": "2.0.0",
        "agentic_skills_loaded": len(skills_engine.skills),
        "ai_key_pool_count": len(ai_engine.api_keys),
        "active_ai_model": ai_engine.active_model,
        "firestore_mode": firestore_store.mode,
        "engine_type": "Multi-Vendor Universal Compliance & Auditing Engine"
    }

# Mount Modular Routers
app.include_router(audit_router)
app.include_router(ai_router)
app.include_router(task_router)
app.include_router(inventory_router)
app.include_router(report_router)

# Expose backward-compatible references
log_aggregator = log_aggregator_engine
