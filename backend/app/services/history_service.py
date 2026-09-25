"""
VectorNet Audit History Service
===============================
Manages historical logs of evaluated network configurations, detected vendors,
hardware models, compliance scores, and security violation breakdowns.
Persisted in local JSON storage for high performance and offline reliability.
"""

import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

HISTORY_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "audit_history.json"
)

DEFAULT_SEEDED_HISTORY = [
    {
        "id": "audit-cisco-01",
        "timestamp": "2026-09-25T09:30:00Z",
        "formatted_date": "Today, 09:30 AM",
        "source_name": "cisco_ios_router.cfg",
        "vendor": "Cisco Systems",
        "hardware": "ISR 4451 Router",
        "os_platform": "Cisco IOS-XE 16.09.04",
        "device_type": "router",
        "hostname": "RTR-NYC-CORE-01",
        "compliance_score": 67,
        "passed_count": 6,
        "violations_count": 3,
        "total_controls": 9,
        "status": "NEEDS_ATTENTION",
        "frameworks": ["NIST SP 800-53", "CIS Benchmarks", "CERT-In"],
        "critical_violations": ["CIS-CSC-16.1 (Weak Password)", "NIST-AC-17 (Telnet Cleartext)"],
        "lines_count": 205,
        "file_size_kb": 6.8,
    },
    {
        "id": "audit-juniper-01",
        "timestamp": "2026-09-25T08:15:00Z",
        "formatted_date": "Today, 08:15 AM",
        "source_name": "juniper_junos_srx.conf",
        "vendor": "Juniper Networks",
        "hardware": "SRX340 Security Gateway",
        "os_platform": "Junos OS 21.4R1",
        "device_type": "firewall",
        "hostname": "SRX-SFO-EDGE-01",
        "compliance_score": 78,
        "passed_count": 7,
        "violations_count": 2,
        "total_controls": 9,
        "status": "PASS",
        "frameworks": ["NIST SP 800-53", "CIS Benchmarks"],
        "critical_violations": ["CIS-JUNOS-2.3 (Telnet Enabled)"],
        "lines_count": 184,
        "file_size_kb": 5.9,
    },
    {
        "id": "audit-paloalto-01",
        "timestamp": "2026-09-24T16:45:00Z",
        "formatted_date": "Yesterday, 04:45 PM",
        "source_name": "paloalto_panos_firewall.cfg",
        "vendor": "Palo Alto Networks",
        "hardware": "PA-3220 NGFW",
        "os_platform": "PAN-OS 10.2.3",
        "device_type": "firewall",
        "hostname": "FW-DC1-PERIMETER-01",
        "compliance_score": 70,
        "passed_count": 7,
        "violations_count": 3,
        "total_controls": 10,
        "status": "NEEDS_ATTENTION",
        "frameworks": ["NIST SP 800-53", "DISA STIG", "CERT-In"],
        "critical_violations": ["PAN-SEC-01 (Insecure SNMP Community)", "PAN-TEL-01 (Telnet Allowed)"],
        "lines_count": 218,
        "file_size_kb": 7.4,
    },
    {
        "id": "audit-fortinet-01",
        "timestamp": "2026-09-24T11:20:00Z",
        "formatted_date": "Yesterday, 11:20 AM",
        "source_name": "fortinet_fortigate_firewall.conf",
        "vendor": "Fortinet",
        "hardware": "FortiGate-100F",
        "os_platform": "FortiOS 7.2.4",
        "device_type": "firewall",
        "hostname": "FGT-BRANCH-LON-01",
        "compliance_score": 78,
        "passed_count": 7,
        "violations_count": 2,
        "total_controls": 9,
        "status": "PASS",
        "frameworks": ["NIST SP 800-53", "CIS Benchmarks"],
        "critical_violations": ["FOS-ADM-02 (Telnet Management Enabled)"],
        "lines_count": 162,
        "file_size_kb": 5.1,
    },
    {
        "id": "audit-multi-01",
        "timestamp": "2026-09-23T14:10:00Z",
        "formatted_date": "2 days ago",
        "source_name": "campus_core_bundle.cfg (4 Devices)",
        "vendor": "Multi-Vendor",
        "hardware": "Fleet Aggregation (Cisco, Juniper, Palo Alto)",
        "os_platform": "Heterogeneous Fleet",
        "device_type": "fleet",
        "hostname": "CAMPUS-CORE-FLEET",
        "compliance_score": 74,
        "passed_count": 27,
        "violations_count": 10,
        "total_controls": 37,
        "status": "PASS",
        "frameworks": ["NIST SP 800-53", "CIS Benchmarks", "DISA STIG", "CERT-In"],
        "critical_violations": ["SNMP Cleartext", "Telnet Allowed on 2 Nodes"],
        "lines_count": 769,
        "file_size_kb": 25.2,
    },
]


class AuditHistoryService:
    def __init__(self):
        self._ensure_storage()

    def _ensure_storage(self):
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        if not os.path.exists(HISTORY_FILE) or os.path.getsize(HISTORY_FILE) == 0:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_SEEDED_HISTORY, f, indent=2)

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        self._ensure_storage()
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, list):
                data = DEFAULT_SEEDED_HISTORY
            return data[:limit]
        except Exception:
            return DEFAULT_SEEDED_HISTORY[:limit]

    def add_entry(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_storage()
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
            if not isinstance(history, list):
                history = []
        except Exception:
            history = []

        # Generate unique ID and timestamp if not present
        if not entry.get("id"):
            entry["id"] = f"audit-{int(time.time())}"
        if not entry.get("timestamp"):
            entry["timestamp"] = datetime.now(timezone.utc).isoformat()
        if not entry.get("formatted_date"):
            entry["formatted_date"] = "Just now"

        # Prepend to history so newest appears first
        history.insert(0, entry)
        # Cap at 100 entries to prevent disk bloat
        history = history[:100]

        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            print(f"[HistoryService] Warning: Failed to persist history: {e}")

        return entry

    def delete_entry(self, entry_id: str) -> bool:
        self._ensure_storage()
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
            new_history = [e for e in history if e.get("id") != entry_id]
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump(new_history, f, indent=2)
            return True
        except Exception:
            return False

    def clear_history(self) -> bool:
        try:
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)
            return True
        except Exception:
            return False


history_service = AuditHistoryService()
