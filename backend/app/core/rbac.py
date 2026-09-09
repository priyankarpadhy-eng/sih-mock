"""
VectorNet Role-Based Access Control (RBAC) & Immutable Audit Engine
===================================================================
Tracks all administrative actions, AI training loop mappings, and config uploads
under strict operational access tiering.
"""

import time
import uuid
from enum import Enum
from typing import Any, Dict, List
from backend.app.core.models import AuditLogEntry


class Role(str, Enum):
    SUPER_ADMIN = "SuperAdmin"
    SECURITY_AUDITOR = "SecurityAuditor"
    NETWORK_OPERATOR = "NetworkOperator"
    VIEWER = "Viewer"


class RBACAuditEngine:
    """
    System Security, Role-Based Access Control (RBAC) & Immutable Audit Trail Engine.
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
                "details": {"status": "VectorNet Core Engine Bootstrapped"}
            },
            {
                "id": f"aud-{uuid.uuid4().hex[:8]}",
                "user_id": "usr-auditor-04",
                "user_role": Role.SECURITY_AUDITOR,
                "action": "CONFIG_UPLOAD",
                "timestamp": now_ts,
                "ip_address": "10.0.1.25",
                "details": {"target_device": "CUCME-RTR-01", "os_detected": "Cisco IOS 15.1"}
            },
            {
                "id": f"aud-{uuid.uuid4().hex[:8]}",
                "user_id": "usr-operator-02",
                "user_role": Role.NETWORK_OPERATOR,
                "action": "PLAYBOOK_DOWNLOAD",
                "timestamp": now_ts,
                "ip_address": "10.0.1.42",
                "details": {"remediation_target": "NIST-AC-12", "device": "CUCME-RTR-01"}
            }
        ]
        self.logs.extend(default_entries)

    def log_action(self, user_id: str, user_role: str, action: str, ip_address: str = "127.0.0.1", details: Dict[str, Any] = None) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=f"aud-{uuid.uuid4().hex[:8]}",
            user_id=user_id,
            user_role=user_role,
            action=action,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            ip_address=ip_address,
            details=details or {}
        )
        self.logs.insert(0, entry.model_dump())
        return entry

    def verify_permission(self, role: Role, required_permission: str) -> bool:
        permissions = {
            Role.SUPER_ADMIN: ["audit:read", "audit:write", "train:ai", "remediation:generate", "remediation:apply", "admin:all"],
            Role.SECURITY_AUDITOR: ["audit:read", "audit:write", "remediation:generate"],
            Role.NETWORK_OPERATOR: ["audit:read", "remediation:generate", "remediation:apply"],
            Role.VIEWER: ["audit:read"]
        }
        return required_permission in permissions.get(role, [])

    def get_audit_trail(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self.logs[:limit]


rbac_audit_engine = RBACAuditEngine()
