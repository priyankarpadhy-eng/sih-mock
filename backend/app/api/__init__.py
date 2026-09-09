"""
VectorNet REST API Controllers Package
"""
from backend.app.api.audit_router import router as audit_router
from backend.app.api.ai_router import router as ai_router
from backend.app.api.task_router import router as task_router
from backend.app.api.inventory_router import router as inventory_router
from backend.app.api.report_router import router as report_router

__all__ = [
    "audit_router",
    "ai_router",
    "task_router",
    "inventory_router",
    "report_router"
]
