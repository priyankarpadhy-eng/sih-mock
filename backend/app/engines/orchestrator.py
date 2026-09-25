"""
VectorNet Vendor-Agnostic Audit Orchestrator Engine
====================================================
Production-grade orchestration pipeline per Master System Prompt:

1. Normalizes raw config into Universal JSON Schema + SecurityBaselineModel (SBM).
2. Runs deterministic compliance rule engine (NIST, CIS, DISA, vendor rules).
3. Classifies AI task (sensitivity, task type, cloud permission) — DETERMINISTIC.
4. Routes AI query to best available provider via IntelligentRouter.
5. Validates AI response (sections, quality, basic hallucination check).
6. If AI response is substandard or all providers fail → generates deterministic report.
7. Returns unified structured response.

Design principle (Section 3 of Master System Prompt):
  - DETERMINISTIC SECURITY LOGIC runs first and is authoritative.
  - AI is used for explanation, contextual reasoning, remediation narrative.
  - AI can NEVER override deterministic findings.
  - AI output is validated before acceptance.
"""

import json
import os
from typing import Any, Dict, List, Optional, Tuple

from backend.app.engines.compliance import ComplianceEngine
from backend.app.engines.detector import detect_vendor
from backend.app.engines.llm_engine import ai_engine
from backend.app.engines.normalizer import ConfigNormalizer
from backend.app.engines.task_classifier import classify_task
from backend.app.engines.response_validator import validate_response

# Base path resolution
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKILLS_DIR = os.path.join(BASE_DIR, "skills")
GLOBAL_MD_PATH = os.path.join(SKILLS_DIR, "global.md")
VENDORS_DIR = os.path.join(SKILLS_DIR, "vendors")
BENCHMARKS_DIR = os.path.join(SKILLS_DIR, "benchmarks")
CUSTOM_HARDWARE_DIR = os.path.join(SKILLS_DIR, "custom_hardware")

VENDOR_SKILL_MAP = {
    "cisco": "cisco_ios_rules.md",
    "cisco systems": "cisco_ios_rules.md",
    "cisco_ios": "cisco_ios_rules.md",
    "cucme": "cisco_ios_rules.md",
    "fortinet": "fortinet_fortios_rules.md",
    "fortios": "fortinet_fortios_rules.md",
    "palo alto": "palo_alto_rules.md",
    "paloalto": "palo_alto_rules.md",
    "pan-os": "palo_alto_rules.md",
    "juniper": "juniper_junos_rules.md",
    "junos": "juniper_junos_rules.md",
    "checkpoint": "checkpoint.md",
    "check point": "checkpoint.md",
    "gaia": "checkpoint.md",
    "sonic": "sonic_whitebox.md",
    "aws": "aws_security_group.md",
}

# Also keep syslog context files for AI system prompt enrichment
VENDOR_SYSLOG_MAP = {
    "cisco": "cisco_ios.md",
    "cisco systems": "cisco_ios.md",
    "fortinet": "fortinet_fortios.md",
    "palo alto": "palo_alto.md",
    "juniper": "juniper_junos.md",
}


class AuditOrchestrator:
    """
    Vendor-Agnostic Audit Orchestration Pipeline.

    Execution order:
      PASS 1 (Deterministic): Normalization → Rule Engine → Findings
      PASS 2 (AI-Assisted):   Task Classification → Provider Routing → Validation
      MERGE: Combine deterministic + AI findings into unified report
    """

    def __init__(
        self,
        global_md_path: str = GLOBAL_MD_PATH,
        skills_dir: str = VENDORS_DIR,
        benchmarks_dir: str = BENCHMARKS_DIR,
        custom_hardware_dir: str = CUSTOM_HARDWARE_DIR,
    ):
        self.global_md_path = global_md_path
        self.skills_dir = skills_dir
        self.benchmarks_dir = benchmarks_dir
        self.custom_hardware_dir = custom_hardware_dir
        self.global_prompt = self._load_global_prompt()
        self.benchmark_skills = self._load_benchmark_skills()
        self.custom_hardware_skills = self._load_custom_hardware_skills()

    def _load_global_prompt(self) -> str:
        if os.path.exists(self.global_md_path):
            try:
                with open(self.global_md_path, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass
        return "You are VectorNet AI Security Compliance Auditor for NIST, CIS, DISA STIG, and ISO 27001."

    def _load_benchmark_skills(self) -> Dict[str, str]:
        skills = {}
        if os.path.exists(self.benchmarks_dir):
            for fname in sorted(os.listdir(self.benchmarks_dir)):
                if fname.endswith(".md"):
                    fpath = os.path.join(self.benchmarks_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            skills[fname] = f.read()
                    except Exception:
                        pass
        return skills

    def _load_custom_hardware_skills(self) -> Dict[str, str]:
        skills = {}
        if os.path.exists(self.custom_hardware_dir):
            for fname in sorted(os.listdir(self.custom_hardware_dir)):
                if fname.endswith(".md"):
                    fpath = os.path.join(self.custom_hardware_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            skills[fname] = f.read()
                    except Exception:
                        pass
        return skills

    def _load_vendor_context(self, vendor: str) -> Tuple[Optional[str], Optional[str]]:
        """Load vendor rule file AND syslog context file for AI prompt enrichment."""
        v_clean = vendor.lower().strip()

        # Vendor rule file (for AI context)
        rule_content = None
        for key, filename in VENDOR_SKILL_MAP.items():
            if key in v_clean:
                skill_path = os.path.join(self.skills_dir, filename)
                if os.path.exists(skill_path):
                    try:
                        with open(skill_path, "r", encoding="utf-8") as f:
                            rule_content = f.read()
                    except Exception:
                        pass
                break

        # Syslog parsing context (optional enrichment)
        syslog_content = None
        for key, filename in VENDOR_SYSLOG_MAP.items():
            if key in v_clean:
                syslog_path = os.path.join(self.skills_dir, filename)
                if os.path.exists(syslog_path):
                    try:
                        with open(syslog_path, "r", encoding="utf-8") as f:
                            syslog_content = f.read()[:1500]  # Cap syslog context
                    except Exception:
                        pass
                break

        return rule_content, syslog_content

    def build_prompt_full(
        self,
        raw_text: str,
        vendor: Optional[str] = None,
        user_query: Optional[str] = None,
        deep_research: bool = False,
        det_summary=None,
        norm_schema: Optional[Dict] = None,
    ) -> Tuple[str, str, str, list]:
        """
        Builds the AI prompt using a context-minimization approach (Section 32):
        - System instruction: global rules + vendor-specific hardening rules
        - User prompt: normalized schema + deterministic findings (not raw config)
        - Raw config is NOT sent in full to save tokens and reduce hallucination risk
        """
        if norm_schema is None:
            norm_schema = ConfigNormalizer.normalize_to_universal_schema(raw_text, override_vendor=vendor)

        detected = norm_schema["device"]["vendor"]
        hostname = norm_schema["device"]["hostname"]
        os_ver = norm_schema["device"]["os"]

        skills_applied = ["global.md"]

        # ── System Instruction ─────────────────────────────────────────────────
        system_instruction = (
            "You are VectorNet AI Security Compliance Auditor, an elite cyber defense analyst.\n\n"
            "OPERATING MANDATE:\n"
            "1. You are the AI REASONING layer. Deterministic rule results are authoritative — do not contradict them.\n"
            "2. Ground every finding in verifiable evidence from the normalized schema or observed configuration values.\n"
            "3. Use the 5-State findings model: PASS, FAIL, WARNING, UNKNOWN, NOT_APPLICABLE.\n"
            "4. Never invent CLI commands. If exact remediation is unknown, state 'Manual remediation required.'\n"
            "5. Distinguish OBSERVED vs INFERRED vs UNKNOWN evidence.\n"
            "6. Output your audit report directly in GitHub Markdown starting immediately with: ### 1. Executive Summary & Security Posture. Do not include internal scratchpad or thinking preambles.\n\n"
            "================================================================================\n"
            "# GLOBAL AUDIT RULES (global.md)\n"
            "================================================================================\n"
            "Frameworks: NIST SP 800-53 (Rev 5), CIS Benchmarks, DISA STIGs, ISO 27001 (2022).\n"
            "Universal Red Flags (Always CRITICAL or HIGH):\n"
            "- Cleartext Management: Telnet or HTTP without HTTPS redirect.\n"
            "- Weak Passwords: Type-7 Cisco passwords, plaintext passwords, MD5 where SHA-256 mandated.\n"
            "- Session Timeouts: Missing exec-timeout or set to 0 (infinite).\n"
            "- SNMP: Default community strings (public/private), SNMPv1/v2c without ACL.\n"
            "- Logging: No remote syslog host configured.\n"
            "- Time: No NTP servers defined.\n"
            "- Banners: No legal pre-logon warning banner.\n\n"
        )

        # Inject benchmark skill context
        for b_name in self.benchmark_skills.keys():
            skills_applied.append(b_name)

        # Inject vendor-specific hardening rules (Section 37)
        rule_content, syslog_content = self._load_vendor_context(detected)
        if rule_content:
            rule_snippet = rule_content[:2500] if len(rule_content) > 2500 else rule_content
            system_instruction += (
                f"\n================================================================================\n"
                f"# VENDOR HARDENING RULES ({detected.upper()})\n"
                f"================================================================================\n"
                f"{rule_snippet}\n"
            )
            vendor_fname = VENDOR_SKILL_MAP.get(detected.lower().split()[0], "vendor_rules.md")
            skills_applied.append(vendor_fname)

        # ── User Prompt (context-minimized per Section 32) ─────────────────────
        # Send normalized schema + deterministic findings — NOT the full raw config
        user_prompt = (
            f"NORMALIZED UNIVERSAL SCHEMA (vendor-neutral structured representation):\n"
            f"```json\n{json.dumps(norm_schema, indent=2)}\n```\n\n"
        )

        # Include deterministic findings summary (PASS 1 results) to guide AI reasoning
        if det_summary and det_summary.findings:
            failed = [f for f in det_summary.findings if f.status.value in ("FAIL", "WARNING")]
            passed = [f for f in det_summary.findings if f.status.value == "PASS"]
            if failed:
                user_prompt += "DETERMINISTIC RULE ENGINE FINDINGS (authoritative — do not contradict):\n"
                for finding in failed[:8]:  # Cap to avoid token explosion
                    user_prompt += (
                        f"- [{finding.status.value}] {finding.rule_id}: {finding.title}\n"
                        f"  Observed: {finding.observed_value}\n"
                        f"  Required: {finding.required_value}\n"
                        f"  Severity: {finding.severity.value}\n"
                    )
                    if finding.line_start:
                        user_prompt += f"  Evidence line: {finding.line_start}\n"
                user_prompt += f"\n[{len(passed)} controls PASSED]\n\n"

        # Add a small raw config excerpt (first 800 chars) for AI context
        clean_text = (raw_text or "").strip()
        if clean_text:
            excerpt = clean_text[:800]
            user_prompt += f"RAW CONFIG EXCERPT (first 800 chars for context):\n```\n{excerpt}\n```\n\n"

        clean_query = (user_query or "").strip()
        if clean_query:
            user_prompt += f"OPERATOR QUERY: {clean_query}\n\n"
        else:
            user_prompt += "OPERATOR QUERY: Perform comprehensive multi-framework compliance audit and provide vendor-specific remediation.\n\n"

        user_prompt += (
            "AUDIT DIRECTIVE: Analyze the device using the deterministic findings above as ground truth. "
            "Provide explanations, risk context, and vendor-specific remediation commands.\n\n"
            f"### 1. Executive Summary & Security Posture\n"
            f"- **Target Vendor**: {detected}\n"
            f"- **Hostname**: {hostname}\n"
            f"- **Operating System**: {os_ver}\n"
            f"- **Compliance Verdict**: State COMPLIANT or NON-COMPLIANT and estimated risk level (CRITICAL/HIGH/MEDIUM/LOW).\n\n"
            "### 2. Verified Compliance Findings (Evidence & Risk)\n"
            "- For each finding from the deterministic engine, explain why it matters and cite evidence.\n\n"
            "### 3. Step-by-Step Remediation Action Plan\n"
            "- Provide vendor-specific CLI commands. Mark any uncertain command as 'Manual remediation required.'\n\n"
            "### 4. Rollback Plan\n"
            "- Provide exact rollback commands or state 'Restore from pre-audit configuration backup.'"
        )

        return system_instruction, user_prompt, detected, skills_applied

    def _build_deterministic_report(
        self,
        det_summary,
        norm_schema: Dict,
        detected: str,
    ) -> str:
        """
        Build a structured report purely from deterministic rule findings.
        Used when AI is unavailable or response is substandard.
        """
        hw_faults = (det_summary.sbm.evidence_spans or {}).get("hardware_faults", [])
        hw_section = ""
        if hw_faults:
            hw_lines = []
            for hf in hw_faults:
                hw_lines.append(
                    f"- [CRITICAL FAULT] [{hf.get('fault_type')} — Line {hf.get('line_no')}]: "
                    f"`{hf.get('matched_text')}` — {hf.get('diagnostic_message')}"
                )
            hw_section = (
                f"### Hardware & Environmental Health Assessment\n"
                + "\n".join(hw_lines)
                + "\n\n"
            )

        failed_findings = [f for f in det_summary.findings if f.status.value in ("FAIL", "WARNING")]
        passed_findings = [f for f in det_summary.findings if f.status.value == "PASS"]
        unknown_findings = [f for f in det_summary.findings if f.status.value in ("UNKNOWN", "NOT_APPLICABLE")]

        compliance_score = det_summary.compliance_score
        if compliance_score < 50:
            verdict = "NON-COMPLIANT (CRITICAL RISK)"
        elif compliance_score < 75:
            verdict = "NON-COMPLIANT (HIGH RISK)"
        elif compliance_score < 90:
            verdict = "PARTIALLY COMPLIANT (MEDIUM RISK)"
        else:
            verdict = "COMPLIANT"

        # Build findings section
        findings_bullets = ""
        if failed_findings:
            for f in failed_findings[:8]:
                status_badge = f"[{f.status.value}]"
                sev_badge = f"[{f.severity.value}]"
                line_ref = f" — Evidence line {f.line_start}" if f.line_start else ""
                findings_bullets += (
                    f"- {status_badge} {sev_badge} **{f.rule_id}**: {f.title}\n"
                    f"  * Observed: `{f.observed_value}`\n"
                    f"  * Required: `{f.required_value}`\n"
                    f"  * Framework: {f.framework}{line_ref}\n"
                )
        else:
            findings_bullets = "- [PASSED] All primary security baseline controls met.\n"

        if unknown_findings:
            findings_bullets += f"\n**{len(unknown_findings)} controls UNKNOWN** (require live show-commands for verification):\n"
            for f in unknown_findings[:4]:
                findings_bullets += f"  - {f.rule_id}: {f.observed_value}\n"

        # Build remediation section
        remediation_snippets = []
        for f in failed_findings:
            if f.remediation_cli and f.remediation_cli.get("script"):
                script = f.remediation_cli["script"]
                remediation_snippets.append(f"# Fix for {f.rule_id}: {f.title}\n{script}")

        combined_remediation = (
            "\n\n".join(remediation_snippets[:4])
            if remediation_snippets
            else "# All evaluated controls passed. No remediation required."
        )

        # Build rollback section
        rollback_cmd = "# Restore configuration from pre-audit backup checkpoint."
        if failed_findings and failed_findings[0].remediation_cli:
            rollback_cmd = failed_findings[0].remediation_cli.get(
                "rollback", rollback_cmd
            )

        return (
            f"### 1. Executive Summary & Security Posture\n"
            f"- **Target Vendor**: {detected}\n"
            f"- **Hostname**: {norm_schema['device']['hostname']}\n"
            f"- **Operating System**: {norm_schema['device']['os']}\n"
            f"- **Device Type**: {norm_schema['device']['device_type']}\n"
            f"- **Compliance Score**: {compliance_score}% ({verdict})\n"
            f"- **Audit Matrix**: {det_summary.total_checks} controls evaluated — "
            f"{det_summary.passed_checks} PASS, {det_summary.failed_checks} FAIL, "
            f"{det_summary.warning_checks} WARNING, {det_summary.unknown_checks} UNKNOWN\n\n"
            f"{hw_section}"
            f"### 2. Critical Compliance Findings & Evidence\n"
            f"{findings_bullets}\n\n"
            f"### 3. Step-by-Step Remediation Action Plan ({detected})\n"
            f"```bash\n{combined_remediation}\n```\n\n"
            f"### 4. Rollback Plan\n"
            f"```bash\n{rollback_cmd}\n```\n\n"
            f"*Note: This report was generated by the VectorNet Deterministic Rule Engine. "
            f"Findings are based on {det_summary.rule_pack_version} rule pack.*"
        )

    def run_normalized_audit(
        self,
        raw_text: str,
        vendor: Optional[str] = None,
        user_query: Optional[str] = None,
        deep_research: bool = False,
    ) -> Dict[str, Any]:
        """
        End-to-end audit pipeline:
          1. PASS 1: Normalize + deterministic rule engine
          2. PASS 2: AI reasoning (sensitivity-aware, validated)
          3. MERGE: Return unified structured response
        """
        # ── PASS 1: Deterministic Analysis ─────────────────────────────────────
        norm_schema = ConfigNormalizer.normalize_to_universal_schema(raw_text, override_vendor=vendor)
        sbm = ConfigNormalizer.parse_config(raw_text, override_vendor=vendor)
        det_summary = ComplianceEngine.evaluate_compliance(sbm)
        detected = norm_schema["device"]["vendor"]
        skills_applied = ["global.md"]

        # ── PASS 2: AI Reasoning (if config provided) ──────────────────────────
        response_text = ""
        ai_provider = "DETERMINISTIC_RULES"
        ai_model = "deterministic-engine"
        failover_log = []
        ai_analysis_status = "NOT_ATTEMPTED"

        if raw_text.strip() or (user_query and user_query.strip()):
            # Classify task (deterministic — no LLM needed for this)
            task = classify_task(raw_text or "", user_query or "", detected)
            failover_log.append(
                f"Task classified: type={task.task_type}, sensitivity={task.sensitivity}, "
                f"cloud_allowed={task.cloud_allowed}"
            )

            if task.secret_patterns_found:
                failover_log.append(
                    f"Secret patterns detected: {', '.join(task.secret_patterns_found)} — "
                    f"{'cloud blocked' if not task.cloud_allowed else 'using redacted config for cloud'}"
                )

            # Build context-minimized prompt (send normalized schema + det findings, not raw config)
            system_instruction, user_prompt, detected_in_prompt, applied = self.build_prompt_full(
                raw_text=raw_text,
                vendor=vendor,
                user_query=user_query,
                deep_research=deep_research,
                det_summary=det_summary,
                norm_schema=norm_schema,
            )
            skills_applied = applied

            # Route to AI provider
            ai_res = ai_engine.query_with_failover(
                prompt=user_prompt,
                system_instruction=system_instruction,
                sensitivity=task.sensitivity if raw_text.strip() else "low",
                task_type=task.task_type,
            )
            failover_log.extend(ai_res.get("failover_log", []))
            raw_ai_content = ai_res.get("content", "")
            ai_provider = ai_res.get("provider", "DETERMINISTIC_RULES")
            ai_model = ai_res.get("model", "deterministic-engine")

            # Validate AI response (Section 27-28)
            if raw_ai_content:
                if not raw_text.strip():
                    # General conversational query (no config to validate lines against)
                    response_text = raw_ai_content
                    ai_analysis_status = "AI_COMPLETE"
                else:
                    validation = validate_response(
                        content=raw_ai_content,
                        raw_config=raw_text,
                        vendor=detected,
                    )
                    failover_log.append(
                        f"AI response validation: {'PASSED' if validation.passed else 'FAILED'} "
                        f"(score={validation.score:.2f}, confidence={validation.confidence_level})"
                    )
                    if validation.issues:
                        failover_log.extend([f"  - {issue}" for issue in validation.issues])

                    if validation.passed or validation.score >= 0.50:
                        response_text = validation.cleaned_content or raw_ai_content
                        ai_analysis_status = "AI_COMPLETE" if validation.passed else "AI_COMPLETE_WITH_WARNINGS"
                    elif validation.requires_retry:
                        # Could implement retry here — for now fall through to deterministic
                        failover_log.append("AI validation failed — using deterministic report")
                        ai_analysis_status = "AI_SUBSTANDARD"
                    else:
                        ai_analysis_status = "AI_FAILED"
            else:
                failover_log.append("AI returned empty content — using deterministic report")
                ai_analysis_status = "AI_EMPTY"

        # ── Use deterministic report if AI failed or was not attempted ─────────
        if not response_text:
            response_text = self._build_deterministic_report(det_summary, norm_schema, detected)
            if raw_text.strip():
                ai_provider = "DETERMINISTIC_RULES"
                ai_model = "deterministic-engine"

        # ── Build findings payload ─────────────────────────────────────────────
        findings_data = [
            f.model_dump() if hasattr(f, "model_dump") else f.__dict__
            for f in det_summary.findings
        ]

        return {
            "success": True,
            "response_text": response_text,
            "normalized_schema": norm_schema,
            "compliance_score": det_summary.compliance_score,
            "total_checks": det_summary.total_checks,
            "passed_checks": det_summary.passed_checks,
            "failed_checks": det_summary.failed_checks,
            "warning_checks": det_summary.warning_checks,
            "unknown_checks": det_summary.unknown_checks,
            "findings": findings_data,
            "detected_vendor": detected,
            "hostname": norm_schema["device"]["hostname"],
            "provider": ai_provider,
            "model": ai_model,
            "failover_log": failover_log,
            "skills_applied": skills_applied,
            "ai_analysis_status": ai_analysis_status,
            "audit_version": "2026.2-OSCAL",
        }

    def build_prompt(self, raw_text: str, vendor: Optional[str] = None, user_query: Optional[str] = None) -> Tuple[str, str, str]:
        """Legacy compatibility wrapper."""
        sys_inst, usr_prompt, det, _ = self.build_prompt_full(raw_text, vendor=vendor, user_query=user_query)
        return sys_inst, usr_prompt, det

    def run_audit(self, raw_text: str, vendor: Optional[str] = None, user_query: Optional[str] = None) -> Dict[str, Any]:
        """Legacy compatibility wrapper."""
        return self.run_normalized_audit(raw_text, vendor=vendor, user_query=user_query)


audit_orchestrator = AuditOrchestrator()
