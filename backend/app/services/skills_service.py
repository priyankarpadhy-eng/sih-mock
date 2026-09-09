"""
VectorNet Agentic Skills Loader Service
=======================================
Dynamically loads and hot-reloads Markdown (.md) vendor parsing profiles
and evaluates normalized SBM models in memory without requiring server restarts.

Supports two rule categories:
  - benchmark: Framework rules (NIST, CIS, DISA, ISO) applied to ALL vendors
  - vendor: Vendor-specific hardening rules applied only when vendor matches
"""

import glob
import os
import re
from typing import Any, Dict, List, Optional

from backend.app.core.models import (
    AuditFinding,
    ComplianceStatus,
    SecurityBaselineModel,
    SeverityLevel,
)
from backend.app.engines.remediation import RemediationGenerator


# Vendor alias map: normalized detected vendor string → skill vendor tag
VENDOR_ALIAS_MAP = {
    "cisco": "cisco",
    "cisco systems": "cisco",
    "cisco_ios": "cisco",
    "cucme": "cisco",
    "fortinet": "fortinet",
    "fortios": "fortinet",
    "palo alto": "paloalto",
    "palo alto networks": "paloalto",
    "paloalto": "paloalto",
    "pan-os": "paloalto",
    "juniper": "juniper",
    "juniper networks": "juniper",
    "junos": "juniper",
    "check point": "checkpoint",
    "checkpoint": "checkpoint",
    "gaia": "checkpoint",
    "sonic": "sonic",
    "aws": "aws",
    "huawei": "huawei",
}


class SkillRule:
    """Individual compliance or parsing rule parsed from a skill markdown block."""

    def __init__(
        self,
        rule_id: str,
        title: str,
        framework: str,
        control_ref: str,
        target_field: str,
        evaluation_logic: str,
        failure_severity: str,
        description: str,
    ):
        self.rule_id = rule_id
        self.title = title
        self.framework = framework
        self.control_ref = control_ref
        self.target_field = target_field
        self.evaluation_logic = evaluation_logic
        self.failure_severity = failure_severity
        self.description = description


class SkillProfile:
    """Complete vendor or framework skill document representation."""

    def __init__(
        self,
        skill_id: str,
        skill_name: str,
        category: str,
        framework: str,
        vendor: Optional[str],
        filepath: str,
        raw_content: str,
    ):
        self.skill_id = skill_id
        self.skill_name = skill_name
        self.category = category
        self.framework = framework
        self.vendor = vendor  # None for benchmark profiles, vendor tag for vendor profiles
        self.filepath = filepath
        self.raw_content = raw_content
        self.rules: List[SkillRule] = []


class AgenticSkillsEngine:
    """
    Agentic Skills Loader Engine.
    Parses Markdown (.md) dynamic knowledge profiles from /backend/skills at runtime
    and evaluates normalized SBM JSON models dynamically without backend redeployments.

    Rule evaluation order:
      1. Global benchmark rules (NIST, CIS, DISA, ISO) — applied to every device
      2. Vendor-specific hardening rules — only applied when vendor matches
      3. Hardware telemetry faults — always applied
    """

    def __init__(self, skills_dir: Optional[str] = None):
        if skills_dir:
            self.skills_dir = skills_dir
        else:
            # Resolve relative to project root
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            candidate = os.path.join(base_dir, "skills")
            self.skills_dir = candidate if os.path.exists(candidate) else "backend/skills"

        self.skills: Dict[str, SkillProfile] = {}
        self.reload_skills()

    def reload_skills(self):
        self.skills.clear()
        search_path = os.path.join(self.skills_dir, "**", "*.md")
        md_files = glob.glob(search_path, recursive=True)

        for filepath in md_files:
            try:
                profile = self._parse_skill_file(filepath)
                if profile:
                    self.skills[profile.skill_id] = profile
            except Exception:
                pass

    def _parse_skill_file(self, filepath: str) -> Optional[SkillProfile]:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        # Parse YAML frontmatter (required for rule files)
        fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
        if not fm_match:
            return None

        frontmatter_raw = fm_match.group(1)
        body_raw = fm_match.group(2)

        # Basic frontmatter parsing
        meta = {}
        for line in frontmatter_raw.splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()

        skill_id = meta.get("skill_id", os.path.basename(filepath).replace(".md", ""))
        skill_name = meta.get("skill_name", skill_id)
        category = meta.get("category", "benchmark")
        framework = meta.get("framework", skill_name)
        vendor = meta.get("vendor", None)  # New: vendor tag for vendor-specific rule sets

        profile = SkillProfile(
            skill_id=skill_id,
            skill_name=skill_name,
            category=category,
            framework=framework,
            vendor=vendor,
            filepath=filepath,
            raw_content=content
        )

        # Parse rule blocks under ## Control ... or ## VENDOR-RULE-ID: Title
        rule_blocks = re.findall(r"^##\s+(.*?)\n(.*?)(?=\n##|\Z)", body_raw, re.MULTILINE | re.DOTALL)
        for title_line, block in rule_blocks:
            lines = [l.strip() for l in block.splitlines() if l.strip()]
            target_field = ""
            eval_logic = ""
            severity = "HIGH"
            control_ref = title_line
            desc = title_line

            for l in lines:
                if l.startswith("- Target Field:"):
                    target_field = l.split(":", 1)[1].strip().strip("`")
                elif l.startswith("- Evaluation Logic:"):
                    eval_logic = l.split(":", 1)[1].strip().strip("`")
                elif l.startswith("- Failure Severity:"):
                    severity = l.split(":", 1)[1].strip()
                elif l.startswith("- Control Ref:"):
                    control_ref = l.split(":", 1)[1].strip()
                elif l.startswith("- Description:"):
                    desc = l.split(":", 1)[1].strip()

            if eval_logic:
                # Extract rule_id from the heading — everything before the first colon after category prefix
                rule_id_match = re.match(r"^([A-Z][A-Z0-9_\-]+)\s*:", title_line)
                if rule_id_match:
                    rule_id = rule_id_match.group(1)
                else:
                    rule_id = title_line.split(":")[0].replace("Control", "").strip()
                    if not rule_id:
                        rule_id = f"RULE-{abs(hash(title_line)) % 10000}"

                rule = SkillRule(
                    rule_id=rule_id,
                    title=title_line,
                    framework=framework,
                    control_ref=control_ref,
                    target_field=target_field,
                    evaluation_logic=eval_logic,
                    failure_severity=severity,
                    description=desc
                )
                profile.rules.append(rule)

        return profile

    def _resolve_vendor_tag(self, vendor_str: str) -> str:
        """Normalize detected vendor string to the canonical vendor tag used in skill files."""
        if not vendor_str:
            return "generic"
        v = vendor_str.lower().strip()
        for key, tag in VENDOR_ALIAS_MAP.items():
            if key in v:
                return tag
        return v.split()[0] if v else "generic"

    def evaluate_model(self, sbm: SecurityBaselineModel) -> List[AuditFinding]:
        findings: List[AuditFinding] = []
        vendor = sbm.device_metadata.vendor
        detected_vendor_tag = self._resolve_vendor_tag(vendor)
        evidence_spans = sbm.evidence_spans or {}

        # Flatten SBM into evaluation context dict
        context = {
            "exec_timeout_seconds": sbm.authentication_security.exec_timeout_seconds,
            "telnet_enabled": sbm.authentication_security.telnet_enabled,
            "ssh_version": sbm.authentication_security.ssh_version,
            "password_encryption_types": sbm.authentication_security.password_encryption_types,
            "management_acl_applied": sbm.access_control.management_acl_applied,
            "login_block_failed_attempts": sbm.access_control.login_block_failed_attempts,
            "logging_syslog_enabled": sbm.network_and_services.logging_syslog_enabled if sbm.network_and_services else False,
            "snmp_read_community_default": sbm.network_and_services.snmp_read_community_default if sbm.network_and_services else False,
            "http_management_enabled": sbm.authentication_and_access.http_management_enabled if sbm.authentication_and_access else False,
            "https_management_enabled": sbm.authentication_and_access.https_management_enabled if sbm.authentication_and_access else False,
            "login_banner_configured": sbm.authentication_and_access.login_banner_configured if sbm.authentication_and_access else False,
            "ntp_servers_configured": sbm.network_and_services.ntp_servers_configured if sbm.network_and_services else False,
        }

        # Span alias map to match various field naming conventions
        SPAN_ALIASES = {
            "logging_syslog_enabled": "syslog_enabled",
            "snmp_read_community_default": "snmp_read_default",
            "http_management_enabled": "http_management",
            "https_management_enabled": "https_management",
            "login_banner_configured": "login_banner",
        }

        # Evaluate rules across all loaded skill profiles
        for skill_id, profile in self.skills.items():
            # Skip profiles with no rules
            if not profile.rules:
                continue

            # Category filtering:
            #   "benchmark" → apply to ALL devices regardless of vendor
            #   "vendor" → apply ONLY when profile.vendor matches detected vendor
            if profile.category == "benchmark":
                pass  # Always apply
            elif profile.category == "vendor":
                if not profile.vendor:
                    continue
                if profile.vendor.lower() != detected_vendor_tag:
                    continue
            else:
                continue  # Skip unknown categories (e.g., syslog parsing guides)

            for rule in profile.rules:
                passed = False
                try:
                    # Safely evaluate logic string against context
                    passed = bool(eval(rule.evaluation_logic, {}, context))
                except Exception:
                    passed = False

                severity_enum = SeverityLevel.HIGH
                if rule.failure_severity == "CRITICAL":
                    severity_enum = SeverityLevel.CRITICAL
                elif rule.failure_severity == "MEDIUM":
                    severity_enum = SeverityLevel.MEDIUM
                elif rule.failure_severity == "LOW":
                    severity_enum = SeverityLevel.LOW

                # Extract the leaf field name for evidence lookup
                field_key = rule.target_field.split(".")[-1]
                span = evidence_spans.get(field_key) or evidence_spans.get(SPAN_ALIASES.get(field_key, ""))

                line_start = span.get("line_start") if span else None
                line_end = span.get("line_end") if span else None
                parser_confidence = span.get("confidence", "HIGH") if span else "MEDIUM"

                target_val = context.get(field_key, "Unset")
                if isinstance(target_val, list):
                    observed_str = ", ".join(target_val) if target_val else "None detected"
                else:
                    observed_str = str(target_val)

                if passed:
                    status = ComplianceStatus.PASS
                else:
                    # Fields that need live show-commands but are absent → UNKNOWN
                    # rather than erroneously marking as FAIL
                    if span is None and field_key in [
                        "management_acl_applied",
                        "login_block_failed_attempts",
                        "logging_syslog_enabled",
                        "snmp_read_community_default",
                    ]:
                        status = ComplianceStatus.UNKNOWN
                        observed_str = (
                            "Not observed in supplied artifact — live operational show-command required"
                        )
                    else:
                        status = ComplianceStatus.FAIL
                        # Provide human-readable observed value overrides
                        if field_key == "exec_timeout_seconds":
                            if target_val == 0:
                                observed_str = "0 seconds — session idle timeout disabled or not set"
                            elif target_val > 600:
                                observed_str = f"{target_val} seconds — exceeds 600-second maximum"
                        elif field_key == "telnet_enabled" and target_val is True:
                            span_text = span.get("text", "") if span else ""
                            observed_str = f"Telnet permitted on management interface — evidence: `{span_text}`" if span_text else "Telnet enabled on management interface"
                        elif field_key == "ssh_version":
                            observed_str = f"SSH version {target_val} — version 2 required"
                        elif field_key == "password_encryption_types":
                            observed_str = f"Detected insecure types: {', '.join(target_val)}"
                        elif field_key == "logging_syslog_enabled":
                            span_text = span.get("text", "") if span else ""
                            observed_str = f"Syslog logging disabled or not forwarding — evidence: `{span_text}`" if span_text else "Remote syslog host not configured"
                        elif field_key == "snmp_read_community_default":
                            span_text = span.get("text", "") if span else ""
                            observed_str = f"Default SNMP community string active — evidence: `{span_text}`" if span_text else "Default community string 'public' / 'private' active"
                        elif field_key == "https_management_enabled":
                            observed_str = "HTTPS redirect disabled or unencrypted HTTP management active"

                proposal = (
                    RemediationGenerator.generate_proposal(rule.rule_id, vendor)
                    if status != ComplianceStatus.PASS
                    else None
                )

                finding = AuditFinding(
                    rule_id=rule.rule_id,
                    framework=profile.framework,
                    control_ref=rule.control_ref,
                    title=rule.title,
                    description=rule.description,
                    severity=severity_enum,
                    status=status,
                    observed_value=observed_str,
                    required_value=rule.evaluation_logic,
                    line_start=line_start,
                    line_end=line_end,
                    parser_confidence=parser_confidence,
                    rule_pack_version="2026.2-OSCAL",
                    remediation_cli=proposal,
                    rollback_cli=proposal.get("rollback") if proposal else None,
                )
                findings.append(finding)

        # ── Hardware & Environmental Telemetry ──────────────────────────────────
        hw_faults = evidence_spans.get("hardware_faults") or []
        if hw_faults:
            for fault in hw_faults:
                hw_rule_id = f"HW-{fault['category'][:8].upper()}"
                proposal = RemediationGenerator.generate_proposal(hw_rule_id, vendor)
                findings.append(
                    AuditFinding(
                        rule_id=hw_rule_id,
                        framework="Hardware & Environmental Telemetry",
                        control_ref="HW-DIAG",
                        title=f"Hardware Fault: {fault['category'].replace('_', ' ').title()}",
                        description=fault["description"],
                        severity=(
                            SeverityLevel.CRITICAL
                            if fault["severity"] == "CRITICAL"
                            else SeverityLevel.HIGH
                        ),
                        status=ComplianceStatus.FAIL,
                        observed_value=(
                            f"Matched '{fault['matched_token']}' on line "
                            f"{fault['line_number']}: {fault['line_content']}"
                        ),
                        required_value="Zero physical, thermal, memory, or chassis power faults",
                        line_start=fault["line_number"],
                        line_end=fault["line_number"],
                        parser_confidence="HIGH",
                        rule_pack_version="2026.2-OSCAL",
                        remediation_cli=proposal,
                        rollback_cli=proposal.get("rollback") if proposal else None,
                    )
                )

        return findings

    def get_all_skills(self) -> List[Dict[str, Any]]:
        result = []
        for profile in self.skills.values():
            result.append(
                {
                    "skill_id": profile.skill_id,
                    "skill_name": profile.skill_name,
                    "category": profile.category,
                    "framework": profile.framework,
                    "vendor": profile.vendor,
                    "filepath": profile.filepath,
                    "rule_count": len(profile.rules),
                    "raw_content": profile.raw_content,
                }
            )
        return result

    def update_skill_content(self, filepath_rel: str, raw_content: str) -> bool:
        target_path = (
            os.path.join(self.skills_dir, filepath_rel)
            if not filepath_rel.startswith(self.skills_dir)
            else filepath_rel
        )
        try:
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(raw_content)
            self.reload_skills()
            return True
        except Exception:
            return False


skills_engine = AgenticSkillsEngine()
