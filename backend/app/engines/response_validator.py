"""
VectorNet AI Response Validator
================================
Validates every AI response before accepting it as audit output.
Implements Master System Prompt Sections 26-30:
  - JSON parsing validation (if structured output required)
  - Required section validation (structured audit format)
  - Confidence sanity checks
  - Basic hallucination detection (claims without config evidence)
  - Minimum quality thresholds

Validation result drives: accept → accept with warning → retry → fallback
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ValidationResult:
    passed: bool
    score: float                          # 0.0 to 1.0
    issues: List[str] = field(default_factory=list)
    cleaned_content: str = ""
    is_substandard: bool = False
    requires_retry: bool = False
    requires_fallback: bool = False
    confidence_level: str = "HIGH"        # HIGH | MEDIUM | LOW


# Required sections in a valid audit report
_REQUIRED_SECTIONS = [
    r"(###?\s*1\.|1\.\s+Executive|\bExecutive\s+Summary\b)",
    r"(###?\s*[2-9]|[2-9]\.\s+[A-Za-z]|\bRemediation\b|\bFindings\b)",
]

# Patterns that indicate the AI refused or gave a non-audit response
_REFUSAL_PATTERNS = [
    r"user safety",
    r"i cannot",
    r"i'm sorry",
    r"as an ai",
    r"i don't have",
    r"i am unable",
    r"not appropriate",
]

# Minimum length for a real audit report
MIN_CONTENT_LENGTH = 100


def validate_response(
    content: str,
    raw_config: Optional[str] = None,
    vendor: Optional[str] = None,
) -> ValidationResult:
    """
    Validate an AI-generated audit response.

    Args:
        content: The AI response text to validate
        raw_config: The original configuration (used for hallucination checks)
        vendor: Detected vendor (for consistency checks)

    Returns:
        ValidationResult with pass/fail, score, cleaned_content, and issues list
    """
    issues: List[str] = []
    score = 1.0

    # ── 1. Null / Empty check ──────────────────────────────────────────────────
    if not content or not content.strip():
        return ValidationResult(
            passed=False,
            score=0.0,
            issues=["Response is empty"],
            cleaned_content="",
            is_substandard=True,
            requires_retry=True,
        )

    stripped = content.strip()

    # Strip <think> tags or verbose chain-of-thought scratchpad
    cleaned = re.sub(r"<think>.*?</think>", "", stripped, flags=re.DOTALL)
    cleaned = re.sub(
        r"^.*?Here's a thinking process:.*?(?=(###|##|\b1\.\s+Executive|\bExecutive\s+Summary))",
        "",
        cleaned,
        flags=re.DOTALL | re.IGNORECASE,
    ).strip()
    if not cleaned or len(cleaned) < 50:
        cleaned = stripped

    # ── 2. Minimum length ──────────────────────────────────────────────────────
    if len(cleaned) < MIN_CONTENT_LENGTH:
        return ValidationResult(
            passed=False,
            score=0.1,
            issues=[f"Response too short ({len(cleaned)} chars < {MIN_CONTENT_LENGTH} minimum)"],
            cleaned_content=cleaned,
            is_substandard=True,
            requires_retry=True,
        )

    # ── 3. Refusal / non-audit patterns ───────────────────────────────────────
    content_lower = cleaned.lower()
    for pattern in _REFUSAL_PATTERNS:
        if re.search(pattern, content_lower):
            return ValidationResult(
                passed=False,
                score=0.0,
                issues=[f"AI returned a refusal or non-audit response (pattern: '{pattern}')"],
                cleaned_content=cleaned,
                is_substandard=True,
                requires_retry=True,
            )

    # ── 4. Required sections check ─────────────────────────────────────────────
    sections_found = 0
    for section_pattern in _REQUIRED_SECTIONS:
        if re.search(section_pattern, cleaned, re.IGNORECASE):
            sections_found += 1

    if sections_found == 0:
        issues.append("Response lacks required structured section headings (### 1. Executive Summary expected)")
        score -= 0.3
    elif sections_found == 1:
        issues.append("Response has only one section heading — expected at least Findings and Remediation sections")
        score -= 0.15

    # ── 5. Evidence quality — very basic hallucination check ──────────────────
    # If AI claims "Telnet enabled" but the config doesn't contain telnet-related lines, flag it
    if raw_config:
        config_lower = raw_config.lower()
        # Check for Telnet claims
        if re.search(r'\btelnet\b.*\benabled\b|\btransport\s+input\s+telnet\b', content_lower):
            telnet_evidence = "transport input telnet" in config_lower or "allowaccess" in config_lower
            if not telnet_evidence and "FAIL" in content.upper():
                issues.append(
                    "AI claims Telnet is enabled but no supporting evidence found in config — "
                    "verify manually (possible hallucination)"
                )
                score -= 0.1

        # Check for SSH version claims vs config
        if re.search(r'\bssh\s+version\s+1\b', content_lower):
            ssh_v1_evidence = "ip ssh version 1" in config_lower or "ssh protocol-version v1" in config_lower
            if not ssh_v1_evidence:
                issues.append("AI claims SSH v1 but no clear SSH v1 config line found — treat as INFERRED")
                score -= 0.05

    # ── 6. Vendor consistency ─────────────────────────────────────────────────
    if vendor and vendor.lower() != "generic / unrecognized":
        # Check if the report references the right vendor (case-insensitive substring match)
        vendor_keywords = vendor.lower().split()
        vendor_mentioned = any(kw in content_lower for kw in vendor_keywords if len(kw) > 3)
        if not vendor_mentioned:
            issues.append(f"Response does not mention the detected vendor '{vendor}' — may be generic")
            score -= 0.05

    # ── 7. Final quality determination ────────────────────────────────────────
    score = max(0.0, min(1.0, score))
    passed = score >= 0.60

    # Determine confidence level
    if score >= 0.90:
        confidence = "HIGH"
    elif score >= 0.70:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"

    # Determine escalation action
    requires_retry = not passed and score >= 0.20
    requires_fallback = not passed and score < 0.20

    return ValidationResult(
        passed=passed,
        score=score,
        issues=issues,
        is_substandard=not passed,
        requires_retry=requires_retry,
        requires_fallback=requires_fallback,
        confidence_level=confidence,
    )
