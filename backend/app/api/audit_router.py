"""
VectorNet Compliance & Audit API Router
=======================================
Endpoints for parsing configurations, evaluating 5-state compliance,
generating remediation playbooks, and managing skill rule profiles.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.app.core.models import ComplianceSummary, SecurityBaselineModel
from backend.app.data.sample_configs import SAMPLE_CONFIGS
from backend.app.engines.compliance import ComplianceEngine
from backend.app.engines.normalizer import ConfigNormalizer
from backend.app.engines.remediation import RemediationGenerator
from backend.app.services.firestore_service import firestore_store
from backend.app.services.skills_service import skills_engine
from backend.app.services.task_service import SkillUpdateRequest, TaskEngine

router = APIRouter(tags=["Audit & Compliance"])


@router.get("/api/v1/skills")
def get_skills():
    """Returns all loaded dynamic vendor parsing skills and rules."""
    return skills_engine.get_all_skills()


@router.post("/api/v1/skills/update")
def update_skill(req: SkillUpdateRequest):
    """Updates a dynamic vendor markdown skill profile."""
    if req.user_role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="RBAC Permission Denied: Only Super Admin role has access to modify Agentic Skill files and Global Rules."
        )

    success = skills_engine.update_skill_content(req.filepath, req.content)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to write skill file")
    
    firestore_store.log_audit_event(
        user_uid=req.user_uid,
        user_email=req.user_email,
        user_role=req.user_role,
        action_type="SKILL_FILE_UPDATED",
        resource_affected=req.filepath
    )
    return {"status": "SUCCESS", "filepath": req.filepath, "reloaded_skills": len(skills_engine.skills)}


@router.post("/api/v1/config/parse", response_model=SecurityBaselineModel)
@router.post("/api/verify", response_model=SecurityBaselineModel)
async def parse_and_verify_config(
    raw_config: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    vendor_override: Optional[str] = Form(None)
):
    """Parses raw configuration text or uploaded dump into canonical SBM."""
    text_content = ""
    if file:
        content_bytes = await file.read()
        text_content = content_bytes.decode("utf-8", errors="ignore")
    elif raw_config:
        text_content = raw_config
    else:
        text_content = SAMPLE_CONFIGS["cisco_cucme"]["raw"]

    sbm = ConfigNormalizer.parse_config(text_content, override_vendor=vendor_override)
    firestore_store.log_audit_event(
        user_uid="FIREBASE_UID_AUDITOR_02",
        user_email="auditor@vectornet.io",
        user_role="SECURITY_AUDITOR",
        action_type="CONFIG_UPLOADED",
        resource_affected=f"configs/{sbm.device_metadata.hostname}"
    )
    return sbm


@router.post("/api/v1/audit/evaluate", response_model=ComplianceSummary)
@router.post("/api/evaluate", response_model=ComplianceSummary)
async def api_evaluate_compliance(
    raw_config: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    vendor_override: Optional[str] = Form(None)
):
    """Evaluates security compliance across NIST, CIS, DISA STIG, and ISO 27001."""
    text_content = ""
    if file:
        content_bytes = await file.read()
        text_content = content_bytes.decode("utf-8", errors="ignore")
    elif raw_config:
        text_content = raw_config
    else:
        text_content = SAMPLE_CONFIGS["cisco_cucme"]["raw"]

    sbm = ConfigNormalizer.parse_config(text_content, override_vendor=vendor_override)
    summary = ComplianceEngine.evaluate_compliance(sbm)
    
    # Auto-create Jira/Teams tasks in Firestore for CRITICAL and HIGH failures
    TaskEngine.auto_create_tasks_from_audit(sbm.device_metadata.hostname, sbm.device_metadata.vendor, summary.findings)

    return summary


@router.post("/api/v1/remediation/generate")
@router.post("/api/generate-remediation")
def generate_remediation(rule_id: Optional[str] = None, vendor: str = "Cisco Systems"):
    """Generates syntax-checked CLI remediation proposal with verification & rollback."""
    if rule_id:
        script = RemediationGenerator.generate_fix(rule_id, vendor)
    else:
        script = RemediationGenerator.get_full_cisco_remediation_script()
    
    firestore_store.log_audit_event(
        user_uid="FIREBASE_UID_OPERATOR_03",
        user_email="operator@vectornet.io",
        user_role="NETWORK_OPERATOR",
        action_type="REMEDIATION_EXECUTED",
        resource_affected=f"remediation/{vendor}"
    )
    return {"target_vendor": vendor, "rule_id": rule_id, "remediation_cli": script}
