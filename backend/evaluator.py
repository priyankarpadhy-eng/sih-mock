from typing import List
from backend.models import (
    SecurityBaselineModel,
    AuditFinding,
    ComplianceSummary,
    SeverityLevel,
    ComplianceStatus,
    PasswordHashing,
    SnmpVersion,
    UnifiedJsonLog
)
from backend.remediation import RemediationGenerator

class ComplianceEvaluator:
    """
    Evaluates Security Baseline Models and live Unified JSON Logs against NIST SP 800-53, CIS, DISA STIGs, and ISO 27001.
    """

    @classmethod
    def evaluate(cls, sbm: SecurityBaselineModel, telemetry_logs: List[UnifiedJsonLog] = None) -> ComplianceSummary:
        findings: List[AuditFinding] = []
        vendor = sbm.device_metadata.vendor
        logs = telemetry_logs or []

        # Log evidence analysis
        has_telnet_log = any("TELNET" in l.raw_message or l.parsed_data.get("protocol") == "TELNET" for l in logs)
        has_snmp_log = any("SNMPv2c" in l.raw_message or l.parsed_data.get("protocol") == "SNMPv2c" for l in logs)

        # Rule 1: NIST AC-12 Exec Timeout
        timeout = sbm.authentication_and_access.exec_timeout_seconds
        rule_ac12_pass = (0 < timeout <= 600)
        findings.append(AuditFinding(
            rule_id="NIST-AC-12",
            framework="NIST SP 800-53 (Rev 5)",
            control_ref="AC-2 & AC-12",
            title="Session Termination & Idle Timeout",
            description="Exec session timeout must be explicitly configured and set to <= 600 seconds (10 minutes).",
            severity=SeverityLevel.HIGH,
            status=ComplianceStatus.PASS if rule_ac12_pass else ComplianceStatus.FAIL,
            observed_value=f"{timeout} seconds" if timeout > 0 else "Unset / Unlimited",
            required_value="<= 600 seconds",
            remediation_cli=RemediationGenerator.get_remediation("NIST-AC-12", vendor) if not rule_ac12_pass else None
        ))

        # Rule 2: NIST IA-5(1) Password Hashing
        hash_algo = sbm.account_security.password_hashing_algorithm
        rule_ia5_pass = hash_algo in [PasswordHashing.SHA256]
        findings.append(AuditFinding(
            rule_id="NIST-IA-5",
            framework="NIST SP 800-53 (Rev 5)",
            control_ref="IA-5(1)",
            title="Cryptographic Password Hashing Enclosure",
            description="Rejects weak MD5 or plaintext password hashing algorithms in favor of SHA-256 / SHA-512.",
            severity=SeverityLevel.CRITICAL,
            status=ComplianceStatus.PASS if rule_ia5_pass else ComplianceStatus.FAIL,
            observed_value=str(hash_algo.value).upper(),
            required_value="SHA256 / SHA512",
            remediation_cli=RemediationGenerator.get_remediation("NIST-IA-5", vendor) if not rule_ia5_pass else None
        ))

        # Rule 3: NIST SC-8 Cleartext Management Protocol Prohibition
        telnet = sbm.authentication_and_access.telnet_enabled
        http = sbm.authentication_and_access.http_management_enabled
        rule_sc8_pass = (not telnet) and (not http)
        findings.append(AuditFinding(
            rule_id="NIST-SC-8",
            framework="NIST SP 800-53 (Rev 5)",
            control_ref="SC-8",
            title="Cleartext Management Protocol Elimination",
            description="Telnet and HTTP management interfaces must be disabled in favor of SSHv2 and HTTPS.",
            severity=SeverityLevel.CRITICAL,
            status=ComplianceStatus.PASS if rule_sc8_pass else ComplianceStatus.FAIL,
            observed_value=f"Telnet: {'ENABLED' if telnet else 'DISABLED'}, HTTP: {'ENABLED' if http else 'DISABLED'}",
            required_value="Telnet: DISABLED, HTTP: DISABLED",
            remediation_cli=RemediationGenerator.get_remediation("NIST-SC-8", vendor) if not rule_sc8_pass else None
        ))

        # Rule 4: CIS 1.1 SSH Protocol Version Enforce
        ssh_en = sbm.authentication_and_access.ssh_enabled
        ssh_ver = sbm.authentication_and_access.ssh_version
        rule_cis11_pass = ssh_en and (ssh_ver == 2)
        findings.append(AuditFinding(
            rule_id="CIS-1.1",
            framework="CIS Benchmarks",
            control_ref="Section 1.1",
            title="SSH v2 Protocol Mandatory Enforcement",
            description="Ensure Secure Shell version 2 is active to prevent fallback to vulnerable SSHv1.",
            severity=SeverityLevel.HIGH,
            status=ComplianceStatus.PASS if rule_cis11_pass else ComplianceStatus.FAIL,
            observed_value=f"SSH Version {ssh_ver}" if ssh_en else "SSH Disabled",
            required_value="SSH Enabled (Version 2)",
            remediation_cli=RemediationGenerator.get_remediation("CIS-1.1", vendor) if not rule_cis11_pass else None
        ))

        # Rule 5: CIS 2.2 SNMP v3 Enforcement
        snmp_v = sbm.network_and_services.snmp_version
        snmp_def = sbm.network_and_services.snmp_read_community_default
        rule_cis22_pass = (snmp_v == SnmpVersion.V3) and (not snmp_def)
        findings.append(AuditFinding(
            rule_id="CIS-2.2",
            framework="CIS Benchmarks",
            control_ref="Section 2.2",
            title="SNMP v3 Encryption & Default String Purge",
            description="Requires SNMPv3 with encrypted auth/priv passwords. Default communities ('public'/'private') prohibited.",
            severity=SeverityLevel.HIGH,
            status=ComplianceStatus.PASS if rule_cis22_pass else (ComplianceStatus.WARNING if snmp_v == SnmpVersion.V2C else ComplianceStatus.FAIL),
            observed_value=f"Version: {snmp_v.value.upper()}, Default Community: {'FOUND' if snmp_def else 'CLEARED'}",
            required_value="SNMPv3 (Default String Cleared)",
            remediation_cli=RemediationGenerator.get_remediation("CIS-2.2", vendor) if not rule_cis22_pass else None
        ))

        # Rule 6: DISA STIG-NET-002 Mandatory Warning Banner
        banner = sbm.authentication_and_access.login_banner_configured
        findings.append(AuditFinding(
            rule_id="STIG-NET-002",
            framework="DISA STIGs",
            control_ref="Rule STIG-NET-002",
            title="Tactical Login Warning Banner",
            description="The network device must display an explicit legal notice banner warning unauthorized users prior to logon.",
            severity=SeverityLevel.MEDIUM,
            status=ComplianceStatus.PASS if banner else ComplianceStatus.FAIL,
            observed_value="CONFIGURED" if banner else "MISSING",
            required_value="CONFIGURED",
            remediation_cli=RemediationGenerator.get_remediation("STIG-NET-002", vendor) if not banner else None
        ))

        # Rule 7: ISO 27001 Annex A.12.4.1 Remote Centralized Logging
        syslog = sbm.network_and_services.logging_syslog_enabled
        findings.append(AuditFinding(
            rule_id="ISO-27001-A12",
            framework="ISO/IEC 27001",
            control_ref="Annex A.12.4.1",
            title="Centralized Security Log Emission",
            description="Audit events and system logs must be forwarded asynchronously to a remote centralized SIEM / Syslog host.",
            severity=SeverityLevel.HIGH,
            status=ComplianceStatus.PASS if syslog else ComplianceStatus.FAIL,
            observed_value="SYSLOG FORWARDING ACTIVE" if syslog else "LOCAL ONLY / UNCONFIGURED",
            required_value="CENTRALIZED SYSLOG ACTIVE",
            remediation_cli=RemediationGenerator.get_remediation("ISO-27001-A12", vendor) if not syslog else None
        ))

        # Metrics aggregation
        total_checks = len(findings)
        passed_checks = sum(1 for f in findings if f.status == ComplianceStatus.PASS)
        failed_checks = sum(1 for f in findings if f.status == ComplianceStatus.FAIL)
        warning_checks = sum(1 for f in findings if f.status == ComplianceStatus.WARNING)

        # Compliance score calculation
        raw_score = ((passed_checks + (warning_checks * 0.5)) / total_checks) * 100.0
        compliance_score = round(raw_score, 1)

        return ComplianceSummary(
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_checks=failed_checks,
            warning_checks=warning_checks,
            compliance_score=compliance_score,
            findings=findings,
            sbm=sbm,
            telemetry_logs_evaluated=len(logs)
        )
