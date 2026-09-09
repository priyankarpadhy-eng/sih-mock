"""
VectorNet AI Engine & Machine Learning Router
=============================================
Endpoints for multi-key OpenRouter failover, AI configuration,
vector similarity training loop, and vendor skill training.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Form, HTTPException

from backend.app.core.models import (
    TrainRuleRequest,
    VectorMappingRequest,
    VectorMappingResponse,
)
from backend.app.engines.llm_engine import ai_engine
from backend.app.engines.orchestrator import audit_orchestrator
from backend.app.engines.vector_store import vector_store
from backend.app.services.firestore_service import firestore_store
from backend.app.services.task_service import AIConfigUpdateRequest

router = APIRouter(tags=["AI & Machine Learning"])


@router.get("/api/v1/ai/config")
def get_ai_config():
    """Returns AI model status, available free models, and masked API key pool."""
    return ai_engine.get_config_status()


@router.post("/api/v1/ai/configure")
def configure_ai_pool(req: AIConfigUpdateRequest):
    """Updates OpenRouter API key pool and active model selection."""
    if req.user_role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="RBAC Denied: Only Super Admin can reconfigure AI Key Pool."
        )

    updated = ai_engine.set_key_pool(req.api_keys, req.active_model)
    firestore_store.log_audit_event(
        user_uid=req.user_uid,
        user_email=req.user_email,
        user_role=req.user_role,
        action_type="AI_POOL_RECONFIGURED",
        resource_affected="ai/key_pool"
    )
    return {"status": "SUCCESS", "config": updated}


@router.post("/api/v1/ai/query-failover")
def query_ai_failover(
    prompt: str = Form(...),
    system_instruction: str = Form("You are VectorNet AI Auditor.")
):
    """Queries AI model with multi-key failover and error recovery."""
    return ai_engine.query_with_failover(prompt, system_instruction)


@router.post("/api/v1/ai/train", response_model=VectorMappingResponse)
@router.post("/api/train-vector", response_model=VectorMappingResponse)
def train_vector_model(req: VectorMappingRequest):
    """Maps an unparsed CLI command into cosine vector similarity space."""
    return vector_store.register_vector(req)


@router.post("/api/v1/skills/train-rule")
def train_skill_rule(req: TrainRuleRequest):
    """Writes dynamically learned CLI rule directly to vendor markdown skill file."""
    result = vector_store.train_rule_to_skill(
        vendor=req.vendor,
        cli_snippet=req.cli_snippet,
        target_sbm_key=req.target_sbm_key,
        description=req.description or ""
    )
    firestore_store.log_audit_event(
        user_uid=req.user_uid or "FIREBASE_UID_SUPERADMIN_01",
        user_email="admin@vectornet.io",
        user_role="SUPER_ADMIN",
        action_type="SKILL_RULE_TRAINED",
        resource_affected=f"skills/{result.get('file', 'custom')}"
    )
    return result


@router.get("/api/v1/ai/mappings")
def get_vector_mappings():
    """Returns all registered vector similarity mappings."""
    return vector_store.get_all_mappings()


@router.get("/api/vector-match")
def match_cli_vector(cli_line: str):
    """Matches a single CLI command string against learned vector store."""
    return vector_store.find_best_match(cli_line)


@router.post("/api/v1/ai/orchestrate")
def orchestrate_ai_audit(
    raw_config: str = Form(...),
    vendor: Optional[str] = Form(None),
    user_query: Optional[str] = Form(None)
):
    """Executes multi-layered audit: global prompt + vendor skill + LLM failover."""
    return audit_orchestrator.run_audit(raw_config, vendor=vendor, user_query=user_query)
