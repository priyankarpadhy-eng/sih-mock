import os
import json
import time
import uuid
from typing import List, Dict, Any, Optional

# Attempt Firebase Admin SDK import with fallback
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth
    HAS_FIREBASE = True
except Exception:
    HAS_FIREBASE = False

def load_dotenv_if_present():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        v = v.strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

class FirestoreStore:
    """
    Firebase Authentication & Cloud Firestore Database Architecture Wrapper for Sentinel-Net.
    Manages Firestore Collections: 'users', 'tasks', and 'audit_logs'.
    Supports dual-mode: Live Firebase Cloud Firestore or JSON file-backed store fallback.
    """

    def __init__(self, storage_file: str = "firestore_db.json"):
        self.storage_file = storage_file
        self.db = None
        self.mode = "LOCAL_MOCK"
        self._local_data: Dict[str, List[Dict[str, Any]]] = {
            "users": [],
            "tasks": [],
            "audit_logs": []
        }
        
        self._init_firebase()
        if self.mode == "LOCAL_MOCK":
            self._load_local_storage()
            if not self._local_data["users"]:
                self._seed_default_firestore_data()

    def _init_firebase(self):
        load_dotenv_if_present()
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_credentials.json")
        proj_id = os.getenv("FIREBASE_PROJECT_ID")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        private_key = os.getenv("FIREBASE_PRIVATE_KEY")

        if HAS_FIREBASE:
            try:
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    self.db = firestore.client()
                    self.mode = "LIVE_FIRESTORE"
                elif proj_id and client_email and private_key and "REPLACE_WITH_YOUR" not in private_key:
                    cred_dict = {
                        "type": "service_account",
                        "project_id": proj_id,
                        "client_email": client_email,
                        "private_key": private_key.replace("\\n", "\n"),
                        "token_uri": "https://oauth2.googleapis.com/token"
                    }
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred)
                    self.db = firestore.client()
                    self.mode = "LIVE_FIRESTORE"
                else:
                    self.mode = "LOCAL_MOCK"
            except Exception:
                self.mode = "LOCAL_MOCK"
        else:
            self.mode = "LOCAL_MOCK"

    def _load_local_storage(self):
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, "r", encoding="utf-8") as f:
                    self._local_data = json.load(f)
            except Exception:
                pass

    def _save_local_storage(self):
        try:
            with open(self.storage_file, "w", encoding="utf-8") as f:
                json.dump(self._local_data, f, indent=2)
        except Exception:
            pass

    def _seed_default_firestore_data(self):
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        # Seed default users
        self._local_data["users"] = [
            {
                "uid": "FIREBASE_UID_SUPERADMIN_01",
                "email": "priyankar@sentinel.net",
                "display_name": "Priyankar Padhy",
                "role": "SUPER_ADMIN",
                "team_id": "TEAM_VECTOR_DEFENSE",
                "assigned_devices": ["CUCME-RTR-01", "DEV-CSCO-01", "DEV-PAN-01"],
                "created_at": now_ts
            },
            {
                "uid": "FIREBASE_UID_AUDITOR_02",
                "email": "auditor@sentinel.net",
                "display_name": "Senior Cyber Auditor",
                "role": "SECURITY_AUDITOR",
                "team_id": "TEAM_VECTOR_DEFENSE",
                "assigned_devices": ["DEV-JUN-01"],
                "created_at": now_ts
            },
            {
                "uid": "FIREBASE_UID_OPERATOR_03",
                "email": "operator@sentinel.net",
                "display_name": "Lead Network Operator",
                "role": "NETWORK_OPERATOR",
                "team_id": "TEAM_VECTOR_DEFENSE",
                "assigned_devices": ["CUCME-RTR-01"],
                "created_at": now_ts
            }
        ]

        # Seed default Jira/Teams tasks
        self._local_data["tasks"] = [
            {
                "task_id": "TASK-2026-0089",
                "title": "Remediate Telnet & Exec-Timeout on CUCME Router",
                "device_id": "CUCME-RTR-01",
                "device_hostname": "CUCME",
                "vendor": "cisco",
                "status": "IN_PROGRESS",
                "priority": "CRITICAL",
                "reporter_uid": "FIREBASE_UID_SUPERADMIN_01",
                "assignee_uid": "FIREBASE_UID_OPERATOR_03",
                "finding_reference": {
                    "rule_id": "NIST AC-12",
                    "raw_value": "exec-timeout 0 0"
                },
                "remediation_script": "line vty 0 4\n transport input ssh\n exec-timeout 10 0",
                "comments": [
                    {
                        "comment_id": "C1",
                        "author_uid": "FIREBASE_UID_OPERATOR_03",
                        "author_name": "Priyankar Padhy",
                        "text": "Applying fix during scheduled maintenance window at 22:00 IST.",
                        "timestamp": now_ts
                    }
                ],
                "created_at": now_ts,
                "updated_at": now_ts
            },
            {
                "task_id": "TASK-2026-0090",
                "title": "Upgrade Reversible Type 7 Passwords to Secret 4 Hashes",
                "device_id": "CUCME-RTR-01",
                "device_hostname": "CUCME",
                "vendor": "cisco",
                "status": "TODO",
                "priority": "CRITICAL",
                "reporter_uid": "FIREBASE_UID_SUPERADMIN_01",
                "assignee_uid": "FIREBASE_UID_OPERATOR_03",
                "finding_reference": {
                    "rule_id": "DISA IA-5",
                    "raw_value": "password 7 0822455D0A16"
                },
                "remediation_script": "no username b\nusername b privilege 15 secret 4 <NEW_STRONG_SECRET>",
                "comments": [],
                "created_at": now_ts,
                "updated_at": now_ts
            }
        ]

        # Seed default audit logs
        self._local_data["audit_logs"] = [
            {
                "log_id": "LOG-99201",
                "user_uid": "FIREBASE_UID_SUPERADMIN_01",
                "user_email": "priyankar@sentinel.net",
                "user_role": "SUPER_ADMIN",
                "action_type": "SKILL_FILE_UPDATED",
                "resource_affected": "skills/vendors/sonic_whitebox.md",
                "ip_address": "192.168.1.50",
                "timestamp": now_ts
            }
        ]
        self._save_local_storage()

    # Firestore User Management Methods
    def get_user(self, uid: str) -> Optional[Dict[str, Any]]:
        for u in self._local_data["users"]:
            if u["uid"] == uid:
                return u
        return None

    def get_all_users(self) -> List[Dict[str, Any]]:
        return self._local_data["users"]

    # Firestore Task Management Methods
    def get_tasks(self, assignee_uid: Optional[str] = None, status: Optional[str] = None, priority: Optional[str] = None) -> List[Dict[str, Any]]:
        tasks = self._local_data["tasks"]
        if assignee_uid:
            tasks = [t for t in tasks if t.get("assignee_uid") == assignee_uid]
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        if priority:
            tasks = [t for t in tasks if t.get("priority") == priority]
        return tasks

    def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        t_id = task_data.get("task_id", f"TASK-2026-{uuid.uuid4().hex[:4].upper()}")
        entry = {
            "task_id": t_id,
            "title": task_data.get("title", "Compliance Remediation Task"),
            "device_id": task_data.get("device_id", "DEV-CSCO-01"),
            "device_hostname": task_data.get("device_hostname", "CUCME"),
            "vendor": task_data.get("vendor", "cisco"),
            "status": task_data.get("status", "TODO"),
            "priority": task_data.get("priority", "HIGH"),
            "reporter_uid": task_data.get("reporter_uid", "FIREBASE_UID_SUPERADMIN_01"),
            "assignee_uid": task_data.get("assignee_uid", "FIREBASE_UID_OPERATOR_03"),
            "finding_reference": task_data.get("finding_reference", {}),
            "remediation_script": task_data.get("remediation_script", ""),
            "comments": task_data.get("comments", []),
            "created_at": now_ts,
            "updated_at": now_ts
        }
        self._local_data["tasks"].insert(0, entry)
        self._save_local_storage()
        return entry

    def assign_task(self, task_id: str, assignee_uid: str, status: Optional[str] = None, priority: Optional[str] = None) -> Optional[Dict[str, Any]]:
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        for t in self._local_data["tasks"]:
            if t["task_id"] == task_id:
                t["assignee_uid"] = assignee_uid
                if status:
                    t["status"] = status
                if priority:
                    t["priority"] = priority
                t["updated_at"] = now_ts
                self._save_local_storage()
                return t
        return None

    def add_task_comment(self, task_id: str, author_uid: str, author_name: str, text: str) -> Optional[Dict[str, Any]]:
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        comment_entry = {
            "comment_id": f"C{uuid.uuid4().hex[:4]}",
            "author_uid": author_uid,
            "author_name": author_name,
            "text": text,
            "timestamp": now_ts
        }
        for t in self._local_data["tasks"]:
            if t["task_id"] == task_id:
                t["comments"].append(comment_entry)
                t["updated_at"] = now_ts
                self._save_local_storage()
                return t
        return None

    # Immutable Audit Log Methods
    def log_audit_event(
        self,
        user_uid: str,
        user_email: str,
        user_role: str,
        action_type: str,
        resource_affected: str,
        ip_address: str = "127.0.0.1"
    ) -> Dict[str, Any]:
        now_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        entry = {
            "log_id": f"LOG-{uuid.uuid4().hex[:6].upper()}",
            "user_uid": user_uid,
            "user_email": user_email,
            "user_role": user_role,
            "action_type": action_type,
            "resource_affected": resource_affected,
            "ip_address": ip_address,
            "timestamp": now_ts
        }
        self._local_data["audit_logs"].insert(0, entry)
        self._save_local_storage()
        return entry

    def get_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._local_data["audit_logs"][:limit]

firestore_store = FirestoreStore()
