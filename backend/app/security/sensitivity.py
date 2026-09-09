"""
VectorNet Data Sensitivity & Policy Enforcement
===============================================
Enforces strict defense-grade data classification and cloud transmission policies:
- LOW: Generic conceptual questions -> Cloud allowed
- MEDIUM: Sanitized config snippets -> Cloud allowed depending on policy
- HIGH: Production configs, internal IPs, topology -> Disallow cloud, route local
- CRITICAL: Credentials, passwords, private keys, secrets -> NEVER sent to cloud
"""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel


class SensitivityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PrivacyMode(str, Enum):
    STANDARD = "STANDARD"      # Cloud allowed for low/medium
    PRIVACY = "PRIVACY"        # Only approved enterprise endpoints
    STRICT = "STRICT"          # Local only for configurations
    OFFLINE = "OFFLINE"        # Zero external network calls (Air-gapped)


class TaskComplexity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AITask(BaseModel):
    """Normalized AI task specification object."""
    task_type: str
    vendor: str = "generic"
    sensitivity: SensitivityLevel = SensitivityLevel.HIGH
    complexity: TaskComplexity = TaskComplexity.MEDIUM
    estimated_input_tokens: int = 0
    estimated_output_tokens: int = 0
    requires_reasoning: bool = True
    requires_large_context: bool = False
    requires_web: bool = False
    requires_structured_output: bool = True
    requires_zero_data_retention: bool = True
    latency_priority: str = "medium"
    cost_priority: str = "medium"


# Default enterprise privacy policy
DEFAULT_SENSITIVITY_POLICY = {
    SensitivityLevel.CRITICAL: {"cloud_allowed": False},
    SensitivityLevel.HIGH: {"cloud_allowed": False},
    SensitivityLevel.MEDIUM: {"cloud_allowed": True},
    SensitivityLevel.LOW: {"cloud_allowed": True},
}


class PolicyEngine:
    """Evaluates whether cloud LLM usage is permitted based on sensitivity and privacy mode."""

    def __init__(self, privacy_mode: PrivacyMode = PrivacyMode.STANDARD, policy_override: Optional[Dict[str, Any]] = None):
        self.privacy_mode = privacy_mode
        self.policy = policy_override or DEFAULT_SENSITIVITY_POLICY

    def is_cloud_allowed(self, sensitivity: SensitivityLevel) -> bool:
        if self.privacy_mode in [PrivacyMode.STRICT, PrivacyMode.OFFLINE]:
            return False
        
        rule = self.policy.get(sensitivity, {"cloud_allowed": False})
        return bool(rule.get("cloud_allowed", False))

    def classify_sensitivity(self, raw_text: str, user_query: str = "") -> SensitivityLevel:
        """Deterministic sensitivity classification without LLM calls."""
        combined = f"{raw_text} {user_query}".lower()
        
        # Check for CRITICAL triggers (credentials, private keys, hashes)
        critical_indicators = [
            "begin private key", "begin rsa private key", "begin certificate",
            "password 7 ", "password 0 ", "secret 5 ", "secret 8 ", "secret 9 ",
            "enable secret", "enable password", "snmp-server community",
            "auth-key", "pre-shared-key", "api_key", "bearer "
        ]
        if any(ind in combined for ind in critical_indicators):
            return SensitivityLevel.CRITICAL

        # Check for HIGH triggers (real configs, IP addresses, firewall rules, hostnames)
        high_indicators = [
            "interface ", "config system", "set deviceconfig", "router ospf", "router bgp",
            "syslog", "ip address", "vlan ", "firewall policy", "security-group",
            "hostname ", "sysname "
        ]
        if any(ind in combined for ind in high_indicators) or len(raw_text.splitlines()) > 5:
            return SensitivityLevel.HIGH

        # Check for MEDIUM (small snippets)
        if len(raw_text.strip()) > 30:
            return SensitivityLevel.MEDIUM

        return SensitivityLevel.LOW
