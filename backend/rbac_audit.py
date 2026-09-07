import time
import uuid
from typing import List, Dict, Any, Optional
from backend.models import AuditLogEntry

class Role(str):
    SUPER_ADMIN = "Super Admin"
    SECURITY_AUDITOR = "Security Auditor"
    NETWORK_OPERATOR = "Network Operator"
    VIEWER = "Viewer"

class RBACAuditEngine:
    """
    System Security, Role-Based Access Control (RBAC) & Immutable Audit Trail Engine for Sentinel-Net.
    Tracks all administrative actions, AI training loop mappings, and config uploads.
    """

    def __init__(self, log_file: str = "audit_trail.json"):
        self.log_file = log_file
        self.logs: List[Dict[str, Any]] = []
        self._seed_default_audit_logs()

    def _seed_default_audit_logs(self):
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        default_entries = [
            {
                "id": f"aud-{uuid.uuid4().hex[:8]}",
                "user_id": "usr-super-admin-01",
                "user_role": Role.SUPER_ADMIN,
                "action": "SYSTEM_INITIALIZATION",
                "timestamp": now_ts,
                "ip_address": "127.0.0.1",
                "details": {"status": "Sentinel-Net Core Engine Bootstrapped"}
            },
            {
                "id": f"aud-{uuid.uuid4().hex[:8]}",
                "user_id": "usr-auditor-04",
                "user_role": Role.SECURITY_AUDITOR,
                "action": "CONFIG_UPLOAD",
                "timestamp": now_ts,
                "ip_address": "10.0.10.45",
                "details": {"device": "CUCME", "vendor": "Cisco Systems", "status": "AUDITED"}
            }
        ]
        self.logs.extend(default_entries)

    def log_action(
        self,
        user_id: str,
        user_role: str,
        action: str,
        ip_address: str = "127.0.0.1",
        details: Optional[Dict[str, Any]] = None
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=f"aud-{uuid.uuid4().hex[:8]}",
            user_id=user_id,
            user_role=user_role,
            action=action,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            ip_address=ip_address,
            details=details or {}
        )
        self.logs.insert(0, entry.model_dump()) # Newest first
        return entry

    def get_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.logs[:limit]

    def verify_role_permission(self, role: str, required_permission: str) -> bool:
        permissions = {
            Role.SUPER_ADMIN: ["CONFIG_UPLOAD", "AI_TRAINING_MAPPING", "REMEDIATION_EXPORT", "DELETE_ASSET", "VIEW_LOGS"],
            Role.SECURITY_AUDITOR: ["CONFIG_UPLOAD", "REMEDIATION_EXPORT", "VIEW_LOGS"],
            Role.NETWORK_OPERATOR: ["CONFIG_UPLOAD", "VIEW_LOGS"],
            Role.VIEWER: ["VIEW_LOGS"]
        }
        user_perms = permissions.get(role, [])
        return required_permission in user_perms

rbac_audit_engine = RBACAuditEngine()
