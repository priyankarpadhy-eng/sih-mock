"""
VectorNet Collaborative Task & Workflow Service
================================================
Handles automated ticket creation from audit failures (Jira/Teams),
task assignment, comment threads, and RBAC authorization verification.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from backend.app.services.firestore_service import firestore_store


class TokenVerifyRequest(BaseModel):
    token: str = "DEFAULT_JWT_TOKEN"


class AuthLoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "SUPER_ADMIN"


class AuthSignUpRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None
    role: Optional[str] = "SUPER_ADMIN"


class SkillUpdateRequest(BaseModel):
    filepath: str
    content: str
    user_uid: str = "FIREBASE_UID_SUPERADMIN_01"
    user_email: str = "admin@vectornet.io"
    user_role: str = "SUPER_ADMIN"


class AIConfigUpdateRequest(BaseModel):
    api_keys: List[str]
    active_model: Optional[str] = "google/gemini-2.0-flash-lite-preview-02-05:free"
    user_uid: str = "FIREBASE_UID_SUPERADMIN_01"
    user_email: str = "admin@vectornet.io"
    user_role: str = "SUPER_ADMIN"


class TaskAssignRequest(BaseModel):
    task_id: str
    assignee_uid: str
    status: Optional[str] = None
    priority: Optional[str] = None
    user_uid: str = "FIREBASE_UID_SUPERADMIN_01"


class TaskCommentRequest(BaseModel):
    task_id: str
    author_uid: str
    author_name: str
    text: str


class TaskCreateRequest(BaseModel):
    title: str
    device_id: str
    device_hostname: str
    vendor: str
    priority: str = "HIGH"
    reporter_uid: str = "FIREBASE_UID_SUPERADMIN_01"
    assignee_uid: str = "FIREBASE_UID_OPERATOR_03"
    rule_id: Optional[str] = None
    raw_value: Optional[str] = None
    remediation_script: Optional[str] = None


class TaskEngine:
    """
    Jira / Teams Collaborative Workflow Engine.
    Handles task assignment, comment thread updates, auto-task creation from CRITICAL/HIGH findings,
    and dynamic skill updates.
    """

    @classmethod
    def auto_create_tasks_from_audit(cls, hostname: str, vendor: str, findings: List[Any]) -> List[Dict[str, Any]]:
        created = []
        for f in findings:
            st = getattr(f, "status", None)
            st_val = st.value if hasattr(st, "value") else str(st)
            
            sev = getattr(f, "severity", None)
            sev_val = sev.value if hasattr(sev, "value") else str(sev)

            if st_val == "FAIL" and sev_val in ["CRITICAL", "HIGH"]:
                rule_id = getattr(f, "rule_id", "NET-FAIL")
                title = f"Remediate {rule_id}: {getattr(f, 'title', 'Hardening Violation')}"
                obs = getattr(f, "observed_value", "Non-compliant setting")
                rem = getattr(f, "remediation_cli", {}) or {}
                rem_script = rem.get("script", "") if isinstance(rem, dict) else str(rem)

                task_data = {
                    "title": title,
                    "device_id": f"DEV-{hostname}",
                    "device_hostname": hostname,
                    "vendor": vendor,
                    "status": "TODO",
                    "priority": sev_val,
                    "reporter_uid": "FIREBASE_UID_SUPERADMIN_01",
                    "assignee_uid": "FIREBASE_UID_OPERATOR_03",
                    "finding_reference": {
                        "rule_id": rule_id,
                        "raw_value": obs
                    },
                    "remediation_script": rem_script,
                    "comments": []
                }
                entry = firestore_store.create_task(task_data)
                created.append(entry)
                
                # Log audit event to Firestore
                firestore_store.log_audit_event(
                    user_uid="SYSTEM_AUTOMATED_ENGINE",
                    user_email="engine@vectornet.io",
                    user_role="SUPER_ADMIN",
                    action_type="TASK_ASSIGNED",
                    resource_affected=f"tasks/{entry['task_id']}"
                )

        return created
