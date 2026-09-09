import os
import json
from typing import Dict, Any, Optional, Tuple
from backend.vendor_detector import detect_vendor
from backend.ai_llm_engine import ai_engine
from backend.normalizer import ConfigNormalizer
from backend.compliance_engine import ComplianceEngine

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "skills")
GLOBAL_MD_PATH = os.path.join(SKILLS_DIR, "global.md")
VENDORS_DIR = os.path.join(SKILLS_DIR, "vendors")

VENDOR_SKILL_MAP = {
    "cisco": "cisco_ios.md",
    "cisco systems": "cisco_ios.md",
    "cisco_ios": "cisco_ios.md",
    "cucme": "cisco_ios.md",
    "fortinet": "fortinet_fortios.md",
    "fortios": "fortinet_fortios.md",
    "palo alto": "palo_alto.md",
    "paloalto": "palo_alto.md",
    "pan-os": "palo_alto.md",
    "juniper": "juniper_junos.md",
    "junos": "juniper_junos.md",
    "checkpoint": "checkpoint.md",
    "check point": "checkpoint.md",
    "gaia": "checkpoint.md",
    "sonic": "sonic_whitebox.md",
    "aws": "aws_security_group.md",
}

class AuditOrchestrator:
    """
    Vendor-Agnostic Audit Orchestration Layer.
    1. Loads global system prompt (global.md).
    2. Identifies vendor signature via heuristic detector.
    3. Injects vendor-specific skill file (syslog dialect, benign noise suppression, attack patterns).
    4. Executes query against multi-key OpenRouter AI pool with deterministic fallback.
    """

    def __init__(self, global_md_path: str = GLOBAL_MD_PATH, skills_dir: str = VENDORS_DIR):
        self.global_md_path = global_md_path
        self.skills_dir = skills_dir
        self.global_prompt = self._load_global_prompt()

    def _load_global_prompt(self) -> str:
        if os.path.exists(self.global_md_path):
            try:
                with open(self.global_md_path, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass
        return "You are Sentinel-Net AI Security Compliance Auditor for NIST, CIS, DISA STIG, and ISO 27001."

    def resolve_skill_file(self, vendor: str) -> Optional[str]:
        v_clean = vendor.lower().strip()
        for key, filename in VENDOR_SKILL_MAP.items():
            if key in v_clean:
                skill_path = os.path.join(self.skills_dir, filename)
                if os.path.exists(skill_path):
                    return skill_path
        return None

    def build_prompt(self, raw_text: str, vendor: Optional[str] = None, user_query: Optional[str] = None) -> Tuple[str, str, str]:
        """
        Builds the complete multi-layer prompt:
        System Instruction = global.md + '---' + vendor_skill.md
        User Prompt = raw config/log text + user query
        Returns (system_instruction, user_prompt, detected_vendor)
        """
        if vendor:
            detected = vendor
        else:
            det_result = detect_vendor(raw_text)
            if isinstance(det_result, dict):
                detected = det_result.get("vendor", "Generic Network Device")
            else:
                detected = str(det_result)

        system_instruction = self.global_prompt
        skill_file = self.resolve_skill_file(detected)
        if skill_file and os.path.exists(skill_file):
            try:
                with open(skill_file, "r", encoding="utf-8") as f:
                    vendor_skill_content = f.read()
                    system_instruction += f"\n\n---\n# ACTIVE VENDOR SKILL: {detected.upper()}\n{vendor_skill_content}"
            except Exception:
                pass

        user_prompt = f"TARGET VENDOR: {detected}\n\nRAW CONFIGURATION / TELEMETRY STREAM:\n```\n{raw_text}\n```\n"
        if user_query and user_query.strip():
            user_prompt += f"\nSPECIFIC AUDIT QUERY / OPERATOR INSTRUCTION:\n{user_query.strip()}\n"
        else:
            user_prompt += "\nINSTRUCTION:\nAudit this configuration against NIST SP 800-53, CIS, DISA STIG, and ISO 27001. Provide 5-state findings (PASS/FAIL/WARNING/UNKNOWN) with exact line spans, severity, verification commands, and rollback playbooks."

        return system_instruction, user_prompt, detected

    def run_audit(self, raw_text: str, vendor: Optional[str] = None, user_query: Optional[str] = None) -> Dict[str, Any]:
        """
        Runs the full orchestration pipeline.
        Calls OpenRouter with multi-key failover; falls back to deterministic local rule engine if offline.
        """
        system_instruction, user_prompt, detected = self.build_prompt(raw_text, vendor, user_query)

        # Deterministic SBM baseline evaluation
        sbm = ConfigNormalizer.parse_config(raw_text)
        deterministic_summary = ComplianceEngine.evaluate_compliance(sbm)

        # Query OpenRouter failover pool if keys are available
        ai_response = None
        if ai_engine.api_keys:
            res = ai_engine.query_with_failover(
                prompt=user_prompt,
                system_instruction=system_instruction
            )
            if res.get("success"):
                ai_response = res

        return {
            "status": "COMPLETED",
            "detected_vendor": detected,
            "deterministic_summary": deterministic_summary.dict() if hasattr(deterministic_summary, "dict") else deterministic_summary,
            "ai_response": ai_response,
            "skills_injected": [self.resolve_skill_file(detected)] if self.resolve_skill_file(detected) else ["global.md"]
        }

audit_orchestrator = AuditOrchestrator()
