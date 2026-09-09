"""
VectorNet Compliance Evaluation Engine
======================================
Evaluates normalized Security Baseline Models (SBM) against dynamic agentic
vendor skill profiles covering NIST SP 800-53, CIS Benchmarks, DISA STIGs, and ISO 27001.
Implements the 5-state compliance logic (PASS, FAIL, WARNING, UNKNOWN, NOT_APPLICABLE).
"""

from typing import List, Optional

from backend.app.core.models import (
    AuditFinding,
    ComplianceStatus,
    ComplianceSummary,
    SecurityBaselineModel,
    SeverityLevel,
    UnifiedJsonLog,
)
from backend.app.engines.remediation import RemediationGenerator
from backend.app.services.skills_service import skills_engine


class ComplianceEngine:
    """
    Multi-Framework Agentic Audit Evaluator & Remediation Engine for VectorNet.
    Evaluates Security Baseline Models dynamically against .md Agentic Skill Profiles
    (NIST SP 800-53, CIS Benchmarks, DISA STIGs, ISO 27001).
    """

    @classmethod
    def evaluate_compliance(
        cls,
        baseline: SecurityBaselineModel,
        telemetry_logs: Optional[List[UnifiedJsonLog]] = None
    ) -> ComplianceSummary:
        logs = telemetry_logs or []
        
        # Dynamic evaluation via Agentic .md Skills Engine
        skill_findings = skills_engine.evaluate_model(baseline)

        # Fallback if no skills are loaded
        if not skill_findings:
            vendor = baseline.device_metadata.vendor
            auth_sec = baseline.authentication_security

            timeout = auth_sec.exec_timeout_seconds
            ac12_pass = (0 < timeout <= 600)
            skill_findings.append(AuditFinding(
                rule_id="NIST-AC-12",
                framework="NIST SP 800-53",
                control_ref="Control AC-12",
                title="Session Termination & Idle Timeout Enforcement",
                description="Exec session idle timeout must be explicitly configured and set to > 0 and <= 600 seconds.",
                severity=SeverityLevel.HIGH,
                status=ComplianceStatus.PASS if ac12_pass else ComplianceStatus.FAIL,
                observed_value=f"{timeout} seconds" if timeout > 0 else "0 seconds (Disabled / Infinite)",
                required_value="> 0 and <= 600 seconds",
                remediation_cli={"script": RemediationGenerator.generate_fix("NIST-AC-12", vendor)} if not ac12_pass else None
            ))

        # Metrics aggregation
        total_checks = len(skill_findings)
        passed_checks = sum(1 for f in skill_findings if f.status == ComplianceStatus.PASS)
        failed_checks = sum(1 for f in skill_findings if f.status == ComplianceStatus.FAIL)
        warning_checks = sum(1 for f in skill_findings if f.status == ComplianceStatus.WARNING)
        unknown_checks = sum(1 for f in skill_findings if f.status == ComplianceStatus.UNKNOWN)
        not_applicable_checks = sum(1 for f in skill_findings if f.status == ComplianceStatus.NOT_APPLICABLE)

        # Compliance score: evaluated over verifiable checks
        verifiable_checks = total_checks - not_applicable_checks
        compliance_score = round((passed_checks / verifiable_checks) * 100.0, 1) if verifiable_checks > 0 else 0.0

        return ComplianceSummary(
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            warning_checks=warning_checks,
            unknown_checks=unknown_checks,
            not_applicable_checks=not_applicable_checks,
            compliance_score=compliance_score,
            findings=skill_findings,
            sbm=baseline,
            telemetry_logs_evaluated=len(logs),
            rule_pack_version="2026.1-OSCAL"
        )


def evaluate_compliance(baseline: SecurityBaselineModel) -> ComplianceSummary:
    """Helper convenience function for compliance evaluation."""
    return ComplianceEngine.evaluate_compliance(baseline)
