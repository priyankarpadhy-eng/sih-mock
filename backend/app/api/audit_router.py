"""
VectorNet Compliance & Audit API Router
=======================================
Endpoints for parsing configurations, evaluating 5-state compliance,
generating remediation playbooks, and managing skill rule profiles.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from backend.app.core.models import ComplianceSummary, SecurityBaselineModel
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
def update_skill(update: SkillUpdateRequest):
    """Dynamically updates a vendor skill file and hot-reloads the rule engine."""
    success = TaskEngine.update_skill_definition(
        skill_id=update.skill_id,
        rule_content=update.rule_content,
        updated_by=update.updated_by
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Skill '{update.skill_id}' not found.")
    return {"status": "SUCCESS", "skill_id": update.skill_id, "action": "HOT_RELOADED"}


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

    if not text_content or not text_content.strip():
        raise HTTPException(
            status_code=400,
            detail="No configuration content provided. Please upload a file or supply configuration text."
        )

    sbm = ConfigNormalizer.parse_config(text_content, override_vendor=vendor_override)
    firestore_store.log_audit_event(
        user_uid="FIREBASE_UID_AUDITOR_02",
        user_email="auditor@vectornet.io",
        user_role="SECURITY_AUDITOR",
        action_type="CONFIG_UPLOADED",
        resource_affected=f"configs/{sbm.device_metadata.hostname}"
    )
    return sbm


@router.post("/api/v1/normalize")
@router.post("/api/normalize")
async def api_normalize_universal(
    request: Request,
    raw_config: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    vendor_override: Optional[str] = Form(None)
):
    """
    Problem Statement 26155 Normalization Endpoint:
    Normalizes heterogeneous CLI configs and logs (Cisco, Juniper, Fortinet, Huawei, etc.)
    into the standardized Universal JSON Schema.
    Accepts: form data (raw_config) OR JSON body (raw_text field) OR file upload.
    """
    text_content = ""
    if file:
        content_bytes = await file.read()
        text_content = content_bytes.decode("utf-8", errors="ignore")
    elif raw_config:
        text_content = raw_config
    else:
        # Try to parse JSON body (frontend sends { raw_text: ... })
        try:
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                body = await request.json()
                text_content = body.get("raw_text", body.get("raw_config", ""))
        except Exception:
            pass

    if not text_content or not text_content.strip():
        raise HTTPException(
            status_code=400,
            detail="No configuration or log content provided for normalization."
        )

    normalized = ConfigNormalizer.normalize_to_universal_schema(
        text_content,
        override_vendor=vendor_override,
        use_ai=True
    )
    return {
        "status": "SUCCESS",
        "normalized_schema": normalized,
        **normalized
    }


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

    if not text_content or not text_content.strip():
        raise HTTPException(
            status_code=400,
            detail="No configuration content provided for compliance evaluation."
        )

    sbm = ConfigNormalizer.parse_config(text_content, override_vendor=vendor_override)
    summary = ComplianceEngine.evaluate_compliance(sbm)
    
    # Auto-create Jira/Teams tasks in Firestore for CRITICAL and HIGH failures
    TaskEngine.auto_create_tasks_from_audit(sbm.device_metadata.hostname, sbm.device_metadata.vendor, summary.findings)

    # Record in persistent audit history log
    try:
        from backend.app.services.history_service import history_service
        violations_count = sum(1 for f in summary.findings if getattr(f, 'status', None) in ['FAIL', 'WARNING'])
        passed_count = sum(1 for f in summary.findings if getattr(f, 'status', None) == 'PASS')
        history_service.add_entry({
            "source_name": getattr(file, 'filename', None) or (f"{sbm.device_metadata.vendor.lower().replace(' ', '_')}_audit.cfg"),
            "vendor": sbm.device_metadata.vendor,
            "hardware": sbm.device_metadata.hardware_model or "Network Appliance",
            "os_platform": sbm.device_metadata.os_version or "Enterprise OS",
            "device_type": sbm.device_metadata.device_type or "router",
            "hostname": sbm.device_metadata.hostname,
            "compliance_score": summary.compliance_score,
            "passed_count": passed_count,
            "violations_count": violations_count,
            "total_controls": len(summary.findings),
            "status": "PASS" if summary.compliance_score >= 80 else "NEEDS_ATTENTION",
            "frameworks": ["NIST SP 800-53", "CIS Benchmarks"],
            "critical_violations": [f.title for f in summary.findings if getattr(f, 'severity', None) in ['CRITICAL', 'HIGH'] and getattr(f, 'status', None) in ['FAIL', 'WARNING']][:3],
            "lines_count": len(text_content.splitlines()),
            "file_size_kb": round(len(text_content.encode('utf-8')) / 1024, 1),
            "raw_config": text_content[:50000],
        })
    except Exception as e:
        print(f"[AuditRouter] History logging warning: {e}")

    return summary


@router.get("/api/v1/audit/history")
def get_audit_history(limit: int = 50):
    """Returns past audit evaluation runs with vendor, hardware, compliance score, and violations."""
    from backend.app.services.history_service import history_service
    return {"status": "SUCCESS", "history": history_service.get_history(limit=limit)}


@router.post("/api/v1/audit/history")
def add_audit_history(entry: Dict[str, Any]):
    """Records an audit run in history."""
    from backend.app.services.history_service import history_service
    record = history_service.add_entry(entry)
    return {"status": "SUCCESS", "record": record}


@router.delete("/api/v1/audit/history/{entry_id}")
def delete_audit_history_entry(entry_id: str):
    """Deletes a specific audit history record."""
    from backend.app.services.history_service import history_service
    success = history_service.delete_entry(entry_id)
    return {"status": "SUCCESS" if success else "NOT_FOUND"}


@router.delete("/api/v1/audit/history")
def clear_all_audit_history():
    """Clears all audit history records."""
    from backend.app.services.history_service import history_service
    history_service.clear_history()
    return {"status": "SUCCESS", "message": "History cleared"}


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


@router.get("/api/v1/blockchain/verify")
@router.post("/api/v1/blockchain/verify")
def verify_blockchain_record(config_hash: str):
    """Verifies on-chain cryptographic integrity of a configuration and its audit certificate."""
    from backend.app.services.blockchain_service import blockchain_service
    return blockchain_service.verify_config_integrity(config_hash)


@router.get("/api/v1/blockchain/records")
def get_blockchain_records():
    """Returns all committed blocks and cryptographic audit certificates."""
    from backend.app.services.blockchain_service import blockchain_service
    return blockchain_service._read_ledger()

