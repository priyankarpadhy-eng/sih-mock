"""
VectorNet Agentic Skills Loader Service
=======================================
Dynamically loads and hot-reloads Markdown (.md) vendor parsing profiles
and evaluates normalized SBM models in memory without requiring server restarts.
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
        filepath: str,
        raw_content: str,
    ):
        self.skill_id = skill_id
        self.skill_name = skill_name
        self.category = category
        self.framework = framework
        self.filepath = filepath
        self.raw_content = raw_content
        self.rules: List[SkillRule] = []


class AgenticSkillsEngine:
    """
    Agentic Skills Loader Engine.
    Parses Markdown (.md) dynamic knowledge profiles from /backend/skills at runtime
    and evaluates normalized SBM JSON models dynamically without backend redeployments.
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

        # Parse YAML frontmatter
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

        profile = SkillProfile(
            skill_id=skill_id,
            skill_name=skill_name,
            category=category,
            framework=framework,
            filepath=filepath,
            raw_content=content
        )

        # Parse rule blocks under ## Control ...
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

    def evaluate_model(self, sbm: SecurityBaselineModel) -> List[AuditFinding]:
        findings: List[AuditFinding] = []
        vendor = sbm.device_metadata.vendor
        evidence_spans = sbm.evidence_spans or {}

        # Flatten SBM into dictionary context for python evaluation
        context = {
            "exec_timeout_seconds": sbm.authentication_security.exec_timeout_seconds,
            "telnet_enabled": sbm.authentication_security.telnet_enabled,
            "ssh_version": sbm.authentication_security.ssh_version,
            "password_encryption_types": sbm.authentication_security.password_encryption_types,
            "management_acl_applied": sbm.access_control.management_acl_applied,
            "login_block_failed_attempts": sbm.access_control.login_block_failed_attempts,
            "logging_syslog_enabled": sbm.network_and_services.logging_syslog_enabled if sbm.network_and_services else False
        }

        # Evaluate rules across all benchmark skill profiles
        for skill_id, profile in self.skills.items():
            if profile.category != "benchmark":
                continue

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

                field_key = rule.target_field.split(".")[-1]
                span = evidence_spans.get(field_key)

                line_start = span.get("line_start") if span else None
                line_end = span.get("line_end") if span else None
                parser_confidence = span.get("confidence", "HIGH") if span else "LOW"

                target_val = context.get(field_key, "Unset")
                if isinstance(target_val, list):
                    observed_str = ", ".join(target_val) if target_val else "None"
                else:
                    observed_str = str(target_val)

                if passed:
                    status = ComplianceStatus.PASS
                else:
                    if span is None and field_key in ["management_acl_applied", "login_block_failed_attempts", "logging_syslog_enabled"]:
                        status = ComplianceStatus.UNKNOWN
                        observed_str = "Not observed in supplied artifact (missing show-command context)"
                    else:
                        status = ComplianceStatus.FAIL

                proposal = RemediationGenerator.generate_proposal(rule.rule_id, vendor) if status != ComplianceStatus.PASS else None

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
                    rule_pack_version="2026.1-OSCAL",
                    remediation_cli=proposal,
                    rollback_cli=proposal.get("rollback") if proposal else None
                )
                findings.append(finding)

        return findings

    def get_all_skills(self) -> List[Dict[str, Any]]:
        result = []
        for profile in self.skills.values():
            result.append({
                "skill_id": profile.skill_id,
                "skill_name": profile.skill_name,
                "category": profile.category,
                "framework": profile.framework,
                "filepath": profile.filepath,
                "rule_count": len(profile.rules),
                "raw_content": profile.raw_content
            })
        return result

    def update_skill_content(self, filepath_rel: str, raw_content: str) -> bool:
        target_path = os.path.join(self.skills_dir, filepath_rel) if not filepath_rel.startswith(self.skills_dir) else filepath_rel
        try:
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(raw_content)
            self.reload_skills()
            return True
        except Exception:
            return False


skills_engine = AgenticSkillsEngine()
