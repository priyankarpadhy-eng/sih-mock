"""
VectorNet Secret Scanner & Data Redactor
=======================================
Detects passwords, API keys, private keys, SNMP community strings, and tokens.
Redacts them before cloud dispatch and ensures zero raw credential leakage into logs.
"""

import re
from typing import Dict, List, Tuple


class SecretScanner:
    """Zero-leakage secret detector and redactor for configuration payloads."""

    SECRET_PATTERNS: List[Tuple[str, str]] = [
        ("PRIVATE_KEY", r"-----BEGIN[ A-Z0-9_-]*PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]*PRIVATE KEY-----"),
        ("CISCO_ENABLE_SECRET", r"(enable\s+secret\s+(?:\d\s+)?)\S+"),
        ("CISCO_PASSWORD", r"((?:password|secret)\s+(?:\d\s+)?)\S+"),
        ("GENERIC_PASSWORD", r"(password\s*[:=]\s*[\"']?)[^\s\"']+([\"']?)"),
        ("SNMP_COMMUNITY", r"(snmp-server\s+community\s+)\S+"),
        ("FORTINET_USER_PASS", r"(set\s+(?:password|auth-password|passphrase)\s+(?:ENC\s+)?)\S+"),
        ("JUNIPER_SECRET", r"(authentication-key\s+|\$9\$|\$1\$|\$5\$|\$6\$)\S+"),
        ("API_BEARER_TOKEN", r"(Bearer\s+)[A-Za-z0-9_\-\.]{15,}"),
        ("GENERIC_API_KEY", r"((?:api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*[\"']?)[A-Za-z0-9_\-\.]{12,}([\"']?)"),
    ]

    @classmethod
    def scan_and_redact(cls, text: str) -> Tuple[str, List[Dict[str, str]]]:
        """
        Redacts sensitive tokens from input text.
        Returns:
            (redacted_text, list of detections with secret type and location)
        Never includes the plaintext secret in the detection metadata!
        """
        if not text:
            return text, []

        redacted = text
        detections: List[Dict[str, str]] = []

        for secret_type, pattern in cls.SECRET_PATTERNS:
            matches = list(re.finditer(pattern, redacted, flags=re.IGNORECASE))
            if matches:
                for m in matches:
                    detections.append({
                        "secret_type": secret_type,
                        "action": "REDACTED",
                        "match_start": str(m.start()),
                        "match_end": str(m.end()),
                    })

                # Redact while preserving CLI keyword structure
                if secret_type == "PRIVATE_KEY":
                    redacted = re.sub(pattern, "-----BEGIN PRIVATE KEY-----\n[REDACTED_CRYPTO_KEY]\n-----END PRIVATE KEY-----", redacted, flags=re.IGNORECASE)
                elif secret_type in ["CISCO_ENABLE_SECRET", "CISCO_PASSWORD", "SNMP_COMMUNITY", "FORTINET_USER_PASS"]:
                    redacted = re.sub(pattern, r"\g<1>[REDACTED]", redacted, flags=re.IGNORECASE)
                elif secret_type in ["GENERIC_PASSWORD", "GENERIC_API_KEY"]:
                    redacted = re.sub(pattern, r"\g<1>[REDACTED]\g<2>", redacted, flags=re.IGNORECASE)
                elif secret_type == "API_BEARER_TOKEN":
                    redacted = re.sub(pattern, r"\g<1>[REDACTED_BEARER_TOKEN]", redacted, flags=re.IGNORECASE)
                else:
                    redacted = re.sub(pattern, "[REDACTED_SECRET]", redacted, flags=re.IGNORECASE)

        return redacted, detections

    @classmethod
    def contains_critical_secrets(cls, text: str) -> bool:
        """Quick boolean test if text has any sensitive credentials."""
        if not text:
            return False
        for _, pattern in cls.SECRET_PATTERNS:
            if re.search(pattern, text, flags=re.IGNORECASE):
                return True
        return False
