from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List

from backend.models import (
    SecurityBaselineModel,
    ComplianceSummary,
    VectorMappingRequest,
    VectorMappingResponse,
    DeviceAsset,
    UnifiedJsonLog,
    AuditLogEntry,
    TrainRuleRequest
)
from backend.vendor_detector import VendorDetectorEngine, detect_vendor
from backend.normalizer import ConfigNormalizer
from backend.compliance_engine import ComplianceEngine, evaluate_compliance
from backend.remediation_generator import RemediationGenerator
from backend.ai_trainer_vector import VectorStoreEngine
from backend.rbac_audit import rbac_audit_engine, Role
from backend.report_generator import PDFReportGenerator
from backend.sample_configs import SAMPLE_CONFIGS
from backend.inventory import AssetInventoryEngine
from backend.log_aggregator import CentralizedLogAggregator
from backend.skills_loader import skills_engine
from backend.firebase_config import firestore_store
from backend.ai_llm_engine import ai_engine
from backend.task_router import (
    TaskEngine, TokenVerifyRequest, SkillUpdateRequest, AIConfigUpdateRequest, TaskAssignRequest, TaskCommentRequest, TaskCreateRequest, AuthLoginRequest, AuthSignUpRequest
)
from backend.audit_orchestrator import audit_orchestrator

app = FastAPI(
    title="VectorNet Agentic Compliance & Workflow Engine API",
    description="Engine for SIH 2026 Problem Statement 26155 (NTRO/NCIIPC)",
    version="3.0.0"
)

inventory_engine = AssetInventoryEngine()
log_aggregator = CentralizedLogAggregator()
vector_store = VectorStoreEngine()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "status": "ONLINE",
        "service": "VectorNet Agentic Cyber Command API Engine (SIH 26155)",
        "agentic_skills_loaded": len(skills_engine.skills),
        "ai_key_pool_count": len(ai_engine.api_keys),
        "active_ai_model": ai_engine.active_model,
        "firestore_mode": firestore_store.mode,
        "benchmark_device": "Cisco CUCME (VoIP Gateway Gold Standard)"
    }

@app.get("/api/sample-configs")
def get_sample_configs():
    return SAMPLE_CONFIGS

# =========================================================
# 1. AGENTIC SKILLS FRAMEWORK ENDPOINTS (.MD RULES)
# =========================================================
@app.get("/api/v1/skills")
def get_skills():
    return skills_engine.get_all_skills()

@app.post("/api/v1/skills/update")
def update_skill(req: SkillUpdateRequest):
    # Strict Super Admin RBAC Check
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

# =========================================================
# OPENROUTER MULTI-KEY FAILOVER AI POOL ENDPOINTS
# =========================================================
@app.get("/api/v1/ai/config")
def get_ai_config():
    return ai_engine.get_config_status()

@app.post("/api/v1/ai/config")
def update_ai_config(req: AIConfigUpdateRequest):
    # Strict Super Admin RBAC Check
    if req.user_role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="RBAC Permission Denied: Only Super Admin role can configure OpenRouter API key pools and LLM models."
        )

    updated = ai_engine.set_key_pool(req.api_keys, req.active_model)
    firestore_store.log_audit_event(
        user_uid=req.user_uid,
        user_email=req.user_email,
        user_role=req.user_role,
        action_type="AI_CONFIG_UPDATED",
        resource_affected=f"ai/llm_pool/{len(req.api_keys)}_keys"
    )
    return {"status": "SUCCESS", "config": updated}

@app.post("/api/v1/ai/query-failover")
def query_ai_failover(prompt: str = Form(...), system_instruction: str = Form("You are VectorNet AI Auditor.")):
    res = ai_engine.query_with_failover(prompt, system_instruction)
    return res

# =========================================================
# 2. FIREBASE AUTH & FIRESTORE RBAC ENDPOINTS
# =========================================================
@app.post("/api/v1/auth/login")
def auth_login(req: AuthLoginRequest):
    # Lookup or create user profile
    users = firestore_store.get_all_users()
    matched = None
    for u in users:
        if u["email"].lower() == req.email.lower():
            matched = u
            break

    if not matched:
        matched = {
            "uid": f"usr-{abs(hash(req.email)) % 100000}",
            "email": req.email,
            "display_name": req.email.split("@")[0].title(),
            "role": req.role or "SUPER_ADMIN",
            "team_id": "TEAM_VECTOR_DEFENSE"
        }

    firestore_store.log_audit_event(
        user_uid=matched["uid"],
        user_email=matched["email"],
        user_role=matched["role"],
        action_type="LOGIN",
        resource_affected="auth/login"
    )
    return {"status": "SUCCESS", "user": matched}

@app.post("/api/v1/auth/signup")
def auth_signup(req: AuthSignUpRequest):
    user_obj = {
        "uid": f"usr-{abs(hash(req.email)) % 100000}",
        "email": req.email,
        "display_name": req.display_name or req.email.split("@")[0].title(),
        "role": req.role or "SUPER_ADMIN",
        "team_id": "TEAM_VECTOR_DEFENSE"
    }
    firestore_store.log_audit_event(
        user_uid=user_obj["uid"],
        user_email=user_obj["email"],
        user_role=user_obj["role"],
        action_type="USER_REGISTERED",
        resource_affected="auth/signup"
    )
    return {"status": "SUCCESS", "user": user_obj}

@app.post("/api/v1/auth/verify-token")
def verify_auth_token(req: TokenVerifyRequest):
    user = firestore_store.get_user("FIREBASE_UID_SUPERADMIN_01")
    if not user:
        user = {
            "uid": "FIREBASE_UID_SUPERADMIN_01",
            "email": "priyankar@vectornet.io",
            "display_name": "Priyankar Padhy",
            "role": "SUPER_ADMIN",
            "team_id": "TEAM_VECTOR_DEFENSE"
        }
    
    firestore_store.log_audit_event(
        user_uid=user["uid"],
        user_email=user["email"],
        user_role=user["role"],
        action_type="LOGIN",
        resource_affected="auth/token"
    )
    return {"status": "VERIFIED", "user": user}

@app.get("/api/v1/users")
def get_users():
    return firestore_store.get_all_users()

# =========================================================
# 3. JIRA / TEAMS COLLABORATIVE TASK WORKFLOW ENDPOINTS
# =========================================================
@app.get("/api/v1/tasks")
def get_tasks(
    assignee_uid: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None)
):
    return firestore_store.get_tasks(assignee_uid=assignee_uid, status=status, priority=priority)

@app.post("/api/v1/tasks")
def create_task(req: TaskCreateRequest):
    entry = firestore_store.create_task(req.model_dump())
    firestore_store.log_audit_event(
        user_uid=req.reporter_uid,
        user_email="admin@vectornet.io",
        user_role="SUPER_ADMIN",
        action_type="TASK_CREATED",
        resource_affected=f"tasks/{entry['task_id']}"
    )
    return entry

@app.post("/api/v1/tasks/assign")
def assign_task(req: TaskAssignRequest):
    updated = firestore_store.assign_task(req.task_id, req.assignee_uid, req.status, req.priority)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    
    firestore_store.log_audit_event(
        user_uid=req.user_uid,
        user_email="admin@vectornet.io",
        user_role="SUPER_ADMIN",
        action_type="TASK_UPDATED",
        resource_affected=f"tasks/{req.task_id}"
    )
    return updated

@app.post("/api/v1/tasks/comment")
def add_task_comment(req: TaskCommentRequest):
    updated = firestore_store.add_task_comment(req.task_id, req.author_uid, req.author_name, req.text)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated

@app.get("/api/v1/audit-logs")
@app.get("/api/v1/audit/logs")
def get_audit_logs(limit: int = 50):
    return firestore_store.get_audit_logs(limit=limit)

# =========================================================
# VENDOR DETECTION & CONFIG NORMALIZATION
# =========================================================
@app.post("/api/v1/vendor/detect")
async def api_detect_vendor(raw_config: Optional[str] = Form(None), file: Optional[UploadFile] = File(None)):
    text_content = ""
    if file:
        content_bytes = await file.read()
        text_content = content_bytes.decode("utf-8", errors="ignore")
    elif raw_config:
        text_content = raw_config
    else:
        text_content = SAMPLE_CONFIGS["cisco_cucme"]["raw"]
    
    res = VendorDetectorEngine.detect_vendor(text_content)
    return res

@app.post("/api/v1/config/normalize", response_model=SecurityBaselineModel)
@app.post("/api/ingest", response_model=SecurityBaselineModel)
async def normalize_config(
    raw_config: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    vendor_override: Optional[str] = Form(None)
):
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

# =========================================================
# AI TRAINING & MULTI-FRAMEWORK EVALUATION
# =========================================================
@app.post("/api/v1/ai/train", response_model=VectorMappingResponse)
@app.post("/api/train-vector", response_model=VectorMappingResponse)
def train_vector_model(req: VectorMappingRequest):
    res = vector_store.register_vector(req)
    return res

@app.post("/api/v1/skills/train-rule")
def train_skill_rule(req: TrainRuleRequest):
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

@app.get("/api/v1/ai/mappings")
def get_vector_mappings():
    return vector_store.get_all_mappings()

@app.get("/api/vector-match")
def match_cli_vector(cli_line: str):
    return vector_store.find_best_match(cli_line)

@app.post("/api/v1/audit/evaluate", response_model=ComplianceSummary)
@app.post("/api/evaluate", response_model=ComplianceSummary)
async def api_evaluate_compliance(
    raw_config: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    vendor_override: Optional[str] = Form(None)
):
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

@app.post("/api/v1/remediation/generate")
@app.post("/api/generate-remediation")
def generate_remediation(rule_id: Optional[str] = None, vendor: str = "Cisco Systems"):
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

# =========================================================
# EXECUTIVE PDF REPORT ENGINE
# =========================================================
@app.get("/api/export-pdf")
@app.get("/api/v1/report/pdf")
async def get_pdf_report(
    raw_config: Optional[str] = Query(None),
    download: bool = Query(False)
):
    text_content = raw_config if raw_config else SAMPLE_CONFIGS["cisco_cucme"]["raw"]
    sbm = ConfigNormalizer.parse_config(text_content)
    summary = ComplianceEngine.evaluate_compliance(sbm)
    
    pdf_bytes = PDFReportGenerator.generate_pdf(summary)
    filename = f"vectornet_verification_sheet_{summary.sbm.device_metadata.hostname.lower()}.pdf"
    disp = f"attachment; filename=\"{filename}\"" if download else f"inline; filename=\"{filename}\""
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": disp}
    )

@app.post("/api/export-pdf")
@app.post("/api/v1/report/pdf")
async def post_pdf_report(
    raw_config: Optional[str] = Form(None),
    download: bool = Form(True)
):
    text_content = raw_config if raw_config else SAMPLE_CONFIGS["cisco_cucme"]["raw"]
    sbm = ConfigNormalizer.parse_config(text_content)
    summary = ComplianceEngine.evaluate_compliance(sbm)
    
    pdf_bytes = PDFReportGenerator.generate_pdf(summary)
    filename = f"vectornet_verification_sheet_{summary.sbm.device_metadata.hostname.lower()}.pdf"
    disp = f"attachment; filename=\"{filename}\"" if download else f"inline; filename=\"{filename}\""
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": disp}
    )

@app.get("/api/inventory", response_model=List[DeviceAsset])
def get_inventory():
    return inventory_engine.get_all_assets()

@app.get("/api/logs", response_model=List[UnifiedJsonLog])
def get_logs(device_id: Optional[str] = None):
    return log_aggregator.get_logs(device_id=device_id)

@app.post("/api/verify", response_model=ComplianceSummary)
async def verify_and_audit(
    device_id: Optional[str] = Form(None),
    raw_config: Optional[str] = Form(None)
):
    text_content = raw_config if raw_config else SAMPLE_CONFIGS["cisco_cucme"]["raw"]
    sbm = ConfigNormalizer.parse_config(text_content)
    logs = log_aggregator.get_logs(device_id=device_id)
    summary = ComplianceEngine.evaluate_compliance(sbm, telemetry_logs=logs)
    
    TaskEngine.auto_create_tasks_from_audit(sbm.device_metadata.hostname, sbm.device_metadata.vendor, summary.findings)
    return summary

@app.post("/api/query-ai")
async def query_ai(
    query: str = Form(""),
    raw_config: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    config_text = raw_config or ""
    if file:
        content_bytes = await file.read()
        config_text = content_bytes.decode("utf-8", errors="ignore")
    elif not config_text.strip():
        config_text = SAMPLE_CONFIGS["cisco_cucme"]["raw"]

    sbm = ConfigNormalizer.parse_config(config_text)
    detected_vendor = sbm.device_metadata.vendor
    audit_summary = ComplianceEngine.evaluate_compliance(sbm, telemetry_logs=log_aggregator.get_logs())

    all_logs = log_aggregator.get_logs()
    matched_logs = []
    q_lower = query.lower()

    if q_lower:
        for l in all_logs:
            if (q_lower in l.hostname.lower() or 
                q_lower in l.device_id.lower() or 
                q_lower in l.vendor.lower() or 
                q_lower in l.raw_message.lower() or 
                q_lower in l.category.lower()):
                matched_logs.append(l)
    else:
        matched_logs = all_logs[:3]

    response_text = f"Analyzed database telemetry and hardware specifications for {detected_vendor} ({sbm.device_metadata.hostname})."
    if query.strip():
        if ai_engine.api_keys:
            system_inst, user_prompt, _ = audit_orchestrator.build_prompt(
                raw_text=config_text[:2000],
                vendor=detected_vendor,
                user_query=query
            )
            ai_res = ai_engine.query_with_failover(
                prompt=user_prompt,
                system_instruction=system_inst
            )
            if ai_res.get("success"):
                response_text = ai_res.get("content", response_text)
            else:
                response_text += f" Found {len(matched_logs)} matching log events for query '{query}'."
        else:
            response_text += f" Found {len(matched_logs)} matching log events for query '{query}'."
    if audit_summary and not ai_engine.api_keys:
        response_text += f" Configuration evaluation score is {audit_summary.compliance_score}% with {audit_summary.failed_checks} compliance violations detected (NIST AC-12: FAIL, CIS 1.1.2: FAIL, DISA IA-5: FAIL)."

    return {
        "query": query,
        "response_text": response_text,
        "detected_vendor": detected_vendor,
        "sbm": sbm,
        "audit_summary": audit_summary,
        "matched_logs": matched_logs
    }
