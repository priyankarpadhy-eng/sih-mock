import re
import hashlib
from typing import Tuple, List, Dict, Any
from backend.models import (
    SecurityBaselineModel,
    DeviceMetadata,
    AuthenticationSecurity,
    AccessControl,
    AuthenticationAndAccess,
    AccountSecurity,
    NetworkAndServices,
    PasswordHashing,
    SnmpVersion
)
from backend.vendor_detector import VendorDetectorEngine

class ConfigNormalizer:
    """
    Dynamic Normalization & Security Baseline Schema Engine.
    Parses unstructured CLI configs into standardized SecurityBaselineModel (SBM)
    with OSCAL-inspired line evidence spans and source hashing.
    """

    @classmethod
    def parse_config(cls, raw_text: str, override_vendor: str = None) -> SecurityBaselineModel:
        raw_lines = raw_text.splitlines()
        source_hash = f"sha256:{hashlib.sha256(raw_text.encode('utf-8')).hexdigest()[:16]}"
        
        # 1. Vendor & OS Auto-Detection Engine
        detection = VendorDetectorEngine.detect_vendor(raw_text)
        vendor = override_vendor or detection["vendor"]
        os_version = detection["os_version"]
        device_type = detection["device_type"]

        # Default values
        hostname = "unknown-host"
        ssh_version = 1
        telnet_enabled = False
        exec_timeout_seconds = 600 # Default 10 mins unless parsed
        password_encryption_types: List[str] = []
        management_acl_applied = False
        login_block_failed_attempts = False

        # Evidence span registry: maps field -> {line_start, line_end, text, confidence}
        evidence_spans: Dict[str, Dict[str, Any]] = {}

        # Legacy fields defaults
        ssh_enabled = False
        http_management = False
        https_management = False
        login_banner = False
        default_accounts_disabled = False
        mfa_configured = False
        snmp_ver = SnmpVersion.V1
        snmp_read_default = True
        syslog_enabled = False
        ntp_configured = False

        unmapped_commands: List[str] = []

        in_vty_block = False
        vty_has_exec_timeout = False

        for line_no, raw_line in enumerate(raw_lines, 1):
            line = raw_line.strip()
            if not line or line.startswith("!"):
                continue
            line_l = line.lower()

            # Hostname detection
            if hostname == "unknown-host":
                host_match = re.search(r'(?:hostname|host-name|device-name)\s+["\']?([\w\.\-]+)["\']?', line, re.IGNORECASE)
                if host_match:
                    hostname = host_match.group(1)
                    evidence_spans["hostname"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # OS version detection override if present in line
            ver_match = re.search(r'(?:version|os-version|system-version)\s+["\']?([\w\.\-]+)["\']?', line, re.IGNORECASE)
            if ver_match and os_version == "Unknown OS":
                os_version = ver_match.group(1)
                evidence_spans["os_version"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Check line vty block context
            if "line vty" in line_l or "line con" in line_l:
                in_vty_block = True
            elif line.startswith("line ") or line.startswith("interface ") or line.startswith("router "):
                in_vty_block = False

            # SSH Version
            if "ip ssh version 2" in line_l or "ssh protocol-version v2" in line_l or "ssh v2" in line_l:
                ssh_version = 2
                ssh_enabled = True
                evidence_spans["ssh_version"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            elif "ip ssh version 1" in line_l:
                ssh_version = 1
                ssh_enabled = True
                evidence_spans["ssh_version"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Telnet Permitted Check (e.g. transport input telnet ssh or transport input all)
            if "transport input telnet" in line_l or "transport input all" in line_l:
                telnet_enabled = True
                evidence_spans["telnet_enabled"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            elif "transport input ssh" in line_l and "telnet" not in line_l:
                telnet_enabled = False
                evidence_spans["telnet_enabled"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Exec Timeout Parsing
            timeout_match = re.search(r'exec-timeout\s+(\d+)(?:\s+(\d+))?', line, re.IGNORECASE)
            if timeout_match:
                mins = int(timeout_match.group(1))
                secs = int(timeout_match.group(2)) if timeout_match.group(2) else 0
                exec_timeout_seconds = mins * 60 + secs
                vty_has_exec_timeout = True
                evidence_spans["exec_timeout_seconds"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Password Encryption Hashing Checks (Detect Type 7, Type 5, Plaintext)
            if "password 7" in line_l or "secret 7" in line_l or "service password-encryption" in line_l:
                if "type_7" not in password_encryption_types:
                    password_encryption_types.append("type_7")
                    evidence_spans["password_encryption_types"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            if "password 0" in line_l or (re.search(r'username\s+\S+\s+password\s+[^\d\s]\S+', line, re.IGNORECASE) and "secret" not in line_l):
                if "plaintext" not in password_encryption_types:
                    password_encryption_types.append("plaintext")
                    if "password_encryption_types" not in evidence_spans:
                        evidence_spans["password_encryption_types"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            if "secret 5" in line_l or "secret 4" in line_l or "secret 9" in line_l or "$6$" in line or "$5$" in line:
                if "sha256_or_md5" not in password_encryption_types:
                    password_encryption_types.append("sha256_or_md5")
                    evidence_spans["password_encryption_types"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Management ACL Checks
            if "access-class" in line_l or "ip access-group" in line_l or "apply-groups" in line_l or "management-acl" in line_l:
                management_acl_applied = True
                evidence_spans["management_acl_applied"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Failed Attempts Block Check
            if "login block-for" in line_l or "login-attempt" in line_l or "max-failed-attempts" in line_l:
                login_block_failed_attempts = True
                evidence_spans["login_block_failed_attempts"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Banners & HTTP
            if "banner motd" in line_l or "banner login" in line_l or "pre-login-banner" in line_l:
                login_banner = True
                evidence_spans["login_banner"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            if "ip http server" in line_l:
                http_management = True
                evidence_spans["http_management"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            if "ip http secure-server" in line_l:
                https_management = True
                evidence_spans["https_management"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Track Unmapped CLI Commands for HITL Vector Machine Learning
            is_mapped = any(kw in line_l for kw in [
                "hostname", "version", "ip ssh", "transport input", "exec-timeout",
                "password", "secret", "banner", "snmp-server", "logging", "ntp",
                "interface", "enable secret", "enable password", "service password-encryption"
            ])
            if not is_mapped and len(line) > 3:
                unmapped_commands.append(line)

        # Fallback for hostname
        if hostname == "unknown-host":
            hostname = f"NODE-{abs(hash(raw_text)) % 10000:04d}"

        # If password_encryption_types is empty but raw config has passwords, default to plaintext flag
        if not password_encryption_types and ("password " in raw_text.lower() or "enable password" in raw_text.lower()):
            password_encryption_types.append("plaintext")

        # Build Primary SBM Models for Problem Statement 26155
        dev_meta = DeviceMetadata(
            hostname=hostname,
            vendor=vendor,
            os_version=os_version,
            device_type=device_type
        )

        auth_sec = AuthenticationSecurity(
            ssh_version=ssh_version,
            telnet_enabled=telnet_enabled,
            exec_timeout_seconds=exec_timeout_seconds,
            password_encryption_types=password_encryption_types
        )

        access_ctrl = AccessControl(
            management_acl_applied=management_acl_applied,
            login_block_failed_attempts=login_block_failed_attempts
        )

        # Build Legacy compatibility structures
        legacy_auth = AuthenticationAndAccess(
            ssh_enabled=ssh_enabled or (ssh_version > 0),
            ssh_version=ssh_version,
            telnet_enabled=telnet_enabled,
            http_management_enabled=http_management,
            https_management_enabled=https_management,
            exec_timeout_seconds=exec_timeout_seconds,
            login_banner_configured=login_banner
        )

        legacy_acct = AccountSecurity(
            default_accounts_disabled=default_accounts_disabled,
            password_min_length=8 if "sha256_or_md5" in password_encryption_types else 0,
            password_hashing_algorithm=PasswordHashing.TYPE_7 if "type_7" in password_encryption_types else (
                PasswordHashing.SHA256 if "sha256_or_md5" in password_encryption_types else PasswordHashing.PLAINTEXT
            ),
            mfa_configured=mfa_configured
        )

        legacy_net = NetworkAndServices(
            snmp_version=snmp_ver,
            snmp_read_community_default=snmp_read_default,
            logging_syslog_enabled=syslog_enabled,
            ntp_servers_configured=ntp_configured
        )

        return SecurityBaselineModel(
            device_metadata=dev_meta,
            authentication_security=auth_sec,
            access_control=access_ctrl,
            unmapped_cli_commands=unmapped_commands[:20],
            evidence_spans=evidence_spans,
            source_hash=source_hash,
            authentication_and_access=legacy_auth,
            account_security=legacy_acct,
            network_and_services=legacy_net
        )
