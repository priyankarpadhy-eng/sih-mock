"""
VectorNet Task Classifier & Sensitivity Engine
================================================
Deterministically classifies each AI request by:
  - sensitivity level (low / medium / high / critical)
  - task type (classification / extraction / simple_reasoning / complex_reasoning)
  - complexity (low / medium / high)
  - whether cloud transmission is permitted

As per Master System Prompt Section 6 & 7:
  - Task classification must be DETERMINISTIC where possible
  - Do NOT call another LLM just to decide which LLM to call
  - HIGH/CRITICAL configurations must never reach cloud providers

Secret/sensitive data patterns that force high or critical classification:
  - Passwords / credentials
  - API keys / tokens
  - Private keys
  - SNMP community strings
  - IP addresses in management context
  - Usernames with passwords
"""

import re
from dataclasses import dataclass
from typing import List, Tuple


# ── Sensitive Pattern Registry ─────────────────────────────────────────────────
# Each entry: (pattern, category, severity_bump)
# severity_bump: "critical" forces critical, "high" forces high

_SENSITIVE_PATTERNS: List[Tuple[re.Pattern, str, str]] = [
    # Credentials / passwords
    (re.compile(r'\bpassword\s+\S+', re.IGNORECASE), "password", "high"),
    (re.compile(r'\benable\s+(?:secret|password)\s+\S+', re.IGNORECASE), "enable_secret", "high"),
    (re.compile(r'\busername\s+\S+\s+(?:password|secret)\s+\S+', re.IGNORECASE), "username_password", "high"),
    (re.compile(r'\bpre-shared-key\s+\S+', re.IGNORECASE), "pre_shared_key", "critical"),
    (re.compile(r'\bshared-secret\s+\S+', re.IGNORECASE), "shared_secret", "critical"),

    # Private keys & certificates
    (re.compile(r'-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----', re.IGNORECASE), "private_key", "critical"),
    (re.compile(r'-----BEGIN\s+CERTIFICATE-----', re.IGNORECASE), "certificate", "high"),

    # API keys and tokens (generic patterns)
    (re.compile(r'\b(?:api[_-]?key|access[_-]?token|bearer\s+token)\s*[=:]\s*\S+', re.IGNORECASE), "api_key", "critical"),
    (re.compile(r'\bsk-[a-zA-Z0-9]{32,}', re.IGNORECASE), "openai_key", "critical"),

    # SNMP community strings
    (re.compile(r'\bsnmp-server\s+community\s+\S+', re.IGNORECASE), "snmp_community", "high"),
    (re.compile(r'\bset\s+community-name\s+\S+', re.IGNORECASE), "snmp_community_forti", "high"),

    # Network topology (IPs in critical contexts)
    (re.compile(r'\bip\s+address\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', re.IGNORECASE), "ip_address", "high"),
    (re.compile(r'\bhost\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', re.IGNORECASE), "host_ip", "high"),

    # VPN / tunnel secrets
    (re.compile(r'\bauthentication\s+(?:key|password)\s+\S+', re.IGNORECASE), "auth_key", "critical"),
    (re.compile(r'\bkey\s+chain\s+', re.IGNORECASE), "key_chain", "high"),
    (re.compile(r'\bencrypted-password\s+\S+', re.IGNORECASE), "encrypted_password", "high"),

    # Fortinet admin passwords
    (re.compile(r'\bset\s+password\s+ENC\s+\S+', re.IGNORECASE), "forti_enc_password", "critical"),
    (re.compile(r'\bset\s+passwd\s+\S+', re.IGNORECASE), "forti_passwd", "high"),
]

# ── Complexity signals ─────────────────────────────────────────────────────────
_COMPLEX_SIGNALS = [
    "cross-rule", "correlation", "business impact", "executive", "risk score",
    "remediation plan", "explain why", "vulnerability", "cve", "exploit",
    "attack surface", "threat model",
]

_SIMPLE_SIGNALS = [
    "what is", "define", "list", "show", "summarize", "count",
    "how many", "is telnet", "is ssh", "timeout value",
]


@dataclass
class TaskClassification:
    task_type: str           # classification | extraction | simple_reasoning | complex_reasoning
    sensitivity: str         # low | medium | high | critical
    complexity: str          # low | medium | high
    estimated_input_tokens: int
    estimated_output_tokens: int
    requires_reasoning: bool
    cloud_allowed: bool
    secret_patterns_found: List[str]   # Categories of secrets detected
    redacted_config: str               # Config with secrets masked for cloud use


def classify_task(
    raw_config: str,
    user_query: str = "",
    vendor: str = "generic",
) -> TaskClassification:
    """
    Deterministically classify an audit request.
    Returns sensitivity level, task type, complexity, and a cloud-safe redacted config.

    Rules (Section 7 of Master System Prompt):
      CRITICAL: Credentials, private keys, pre-shared secrets → never cloud
      HIGH: IP addresses, SNMP communities, running config → prefer local
      MEDIUM: Config snippets without obvious secrets → cloud allowed per policy
      LOW: Generic questions, no config → cloud allowed
    """
    combined_text = f"{raw_config}\n{user_query}".strip()

    # ── Secret scanning ────────────────────────────────────────────────────────
    sensitivity = "medium" if raw_config.strip() else "low"
    secret_patterns_found: List[str] = []
    redacted = raw_config

    for pattern, category, severity_bump in _SENSITIVE_PATTERNS:
        if pattern.search(combined_text):
            secret_patterns_found.append(category)
            if severity_bump == "critical":
                sensitivity = "critical"
            elif severity_bump == "high" and sensitivity not in ("critical",):
                sensitivity = "high"
            # Redact matched values in cloud-safe copy
            redacted = pattern.sub(f"[REDACTED:{category.upper()}]", redacted)

    # Bump to HIGH if config is long (likely contains network topology details)
    if len(raw_config) > 500 and sensitivity == "medium":
        sensitivity = "high"

    # ── Task type classification ───────────────────────────────────────────────
    query_lower = user_query.lower()

    if not raw_config.strip() and user_query.strip():
        # No config — pure question
        task_type = "classification"
        complexity = "low"
        sensitivity = min_sensitivity(sensitivity, "low")  # Don't escalate for no-config queries
    elif any(sig in query_lower for sig in _SIMPLE_SIGNALS):
        task_type = "simple_reasoning"
        complexity = "low"
    elif any(sig in query_lower for sig in _COMPLEX_SIGNALS):
        task_type = "complex_reasoning"
        complexity = "high"
    elif raw_config.strip():
        # Config present, generic query or no query → full compliance audit
        task_type = "complex_reasoning"
        complexity = "high"
    else:
        task_type = "simple_reasoning"
        complexity = "medium"

    # ── Token estimation ───────────────────────────────────────────────────────
    estimated_input = max(1, len(combined_text) // 4)
    estimated_output = 1024 if task_type == "complex_reasoning" else 256

    # ── Cloud permission ───────────────────────────────────────────────────────
    cloud_allowed = sensitivity in ("low", "medium")
    requires_reasoning = task_type in ("complex_reasoning", "simple_reasoning")

    return TaskClassification(
        task_type=task_type,
        sensitivity=sensitivity,
        complexity=complexity,
        estimated_input_tokens=estimated_input,
        estimated_output_tokens=estimated_output,
        requires_reasoning=requires_reasoning,
        cloud_allowed=cloud_allowed,
        secret_patterns_found=secret_patterns_found,
        redacted_config=redacted,
    )


def min_sensitivity(current: str, cap: str) -> str:
    """Return the lower of two sensitivity levels."""
    order = ["low", "medium", "high", "critical"]
    current_idx = order.index(current) if current in order else 2
    cap_idx = order.index(cap) if cap in order else 2
    return order[min(current_idx, cap_idx)]


def redact_secrets(text: str) -> str:
    """Standalone utility to redact secrets from text for logging purposes."""
    redacted = text
    for pattern, category, _ in _SENSITIVE_PATTERNS:
        redacted = pattern.sub(f"[REDACTED:{category.upper()}]", redacted)
    return redacted
