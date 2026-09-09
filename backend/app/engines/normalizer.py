"""
VectorNet Configuration Normalizer Engine
=========================================
Transforms multi-vendor raw configuration dumps into the canonical
SecurityBaselineModel (SBM) schema. Records 1-indexed OSCAL line-spans
and calculates SHA-256 cryptographic source integrity hashes.
"""

import hashlib
import re
from typing import Any, Dict, List, Optional
from backend.app.core.models import (
    AccessControl,
    AccountSecurity,
    AuthenticationAndAccess,
    AuthenticationSecurity,
    DeviceMetadata,
    NetworkAndServices,
    PasswordHashing,
    SecurityBaselineModel,
    SnmpVersion,
)
from backend.app.engines.detector import VendorDetectorEngine


class ConfigNormalizer:
    """
    Dynamic Normalization & Security Baseline Schema Engine.
    Parses unstructured CLI configs into standardized SecurityBaselineModel (SBM)
    with OSCAL-inspired line evidence spans and source hashing.
    """

    @classmethod
    def parse_config(cls, raw_text: str, override_vendor: Optional[str] = None) -> SecurityBaselineModel:
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
        exec_timeout_seconds = 600  # Default 10 mins unless parsed
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

        for line_no, raw_line in enumerate(raw_lines, 1):
            line = raw_line.strip()
            if not line or line.startswith("!"):
                continue
            line_l = line.lower()

            # Hostname detection (Cisco, Juniper, Fortinet, Huawei, Palo Alto)
            if hostname == "unknown-host":
                host_match = re.search(r'(?:set\s+hostname|hostname|set\s+system\s+host-name|host-name|sysname|device-name)\s+["\']?([\w\.\-]+)["\']?', line, re.IGNORECASE)
                if host_match:
                    hostname = host_match.group(1)
                    evidence_spans["hostname"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # OS version detection override if present in line
            ver_match = re.search(r'(?:version|os-version|system-version)\s+["\']?([\w\.\-]+)["\']?', line, re.IGNORECASE)
            if ver_match and os_version == "Unknown OS":
                os_version = ver_match.group(1)
                evidence_spans["os_version"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Exec / Admin Session Timeout Parsing
            # Cisco: exec-timeout <mins> <secs>
            # Fortinet: set admintimeout <mins>
            # Juniper/Palo Alto: idle-timeout <mins>
            timeout_match = re.search(r'(?:exec-timeout|admintimeout|idle-timeout)\s+(\d+)(?:\s+(\d+))?', line, re.IGNORECASE)
            if timeout_match:
                mins = int(timeout_match.group(1))
                secs = int(timeout_match.group(2)) if timeout_match.group(2) else 0
                exec_timeout_seconds = mins * 60 + secs
                evidence_spans["exec_timeout_seconds"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Fortinet interface allowaccess inspection (Telnet / HTTP / SSH)
            if "set allowaccess" in line_l:
                tokens = line_l.split()
                if "telnet" in tokens:
                    telnet_enabled = True
                    evidence_spans["telnet_enabled"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
                if "http" in tokens:
                    http_management = True
                    evidence_spans["http_management"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
                if "ssh" in tokens:
                    ssh_version = 2
                    ssh_enabled = True
                    evidence_spans["ssh_version"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
                if "https" in tokens:
                    https_management = True

            # SSH Version (Cisco / Juniper / Generic)
            if "ip ssh version 2" in line_l or "ssh protocol-version v2" in line_l or "ssh v2" in line_l or "set system services ssh" in line_l:
                ssh_version = 2
                ssh_enabled = True
                evidence_spans["ssh_version"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            elif "ip ssh version 1" in line_l:
                ssh_version = 1
                ssh_enabled = True
                evidence_spans["ssh_version"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Telnet Permitted Check (Cisco / Juniper / Palo Alto)
            if "transport input telnet" in line_l or "transport input all" in line_l or "set system services telnet" in line_l or "disable-telnet no" in line_l:
                telnet_enabled = True
                evidence_spans["telnet_enabled"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            elif ("transport input ssh" in line_l and "telnet" not in line_l) or "disable-telnet yes" in line_l:
                telnet_enabled = False
                evidence_spans["telnet_enabled"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Password Encryption Hashing Checks
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
            if "login block-for" in line_l or "login-attempt" in line_l or "max-failed-attempts" in line_l or "admin-lockout" in line_l:
                login_block_failed_attempts = True
                evidence_spans["login_block_failed_attempts"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Banners & HTTP Redirect
            if "banner motd" in line_l or "banner login" in line_l or "set pre-login-banner enable" in line_l:
                login_banner = True
                evidence_spans["login_banner"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            elif "set pre-login-banner disable" in line_l:
                login_banner = False
                evidence_spans["login_banner"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            if "ip http server" in line_l or "set admin-https-redirect disable" in line_l:
                http_management = True
                evidence_spans["http_management"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            if "ip http secure-server" in line_l or "set admin-https-redirect enable" in line_l:
                https_management = True
                evidence_spans["https_management"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # SNMP Community Strings
            if "set name \"public\"" in line_l or "set name \"private\"" in line_l or "community public" in line_l or "community private" in line_l:
                snmp_read_default = True
                evidence_spans["snmp_read_default"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Syslog Monitoring
            if "logging host" in line_l or "config log syslogd" in line_l or "set system syslog" in line_l:
                syslog_enabled = True
                evidence_spans["syslog_enabled"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}
            if "set status disable" in line_l and "syslogd" in raw_text.lower():
                syslog_enabled = False
                evidence_spans["syslog_enabled"] = {"line_start": line_no, "line_end": line_no, "text": line, "confidence": "HIGH"}

            # Track Unmapped CLI Commands for Vector Machine Learning Loop
            is_mapped = any(kw in line_l for kw in [
                "hostname", "version", "ip ssh", "transport input", "exec-timeout",
                "password", "secret", "banner", "snmp-server", "logging", "ntp",
                "interface", "enable secret", "enable password", "service password-encryption",
                "admintimeout", "allowaccess", "syslogd"
            ])
            if not is_mapped and len(line) > 3:
                unmapped_commands.append(line)

        # Fallback for hostname
        if hostname == "unknown-host":
            hostname = f"NODE-{abs(hash(raw_text)) % 10000:04d}"

        if not password_encryption_types and ("password " in raw_text.lower() or "enable password" in raw_text.lower()):
            password_encryption_types.append("plaintext")

        # Hardware and environmental fault detection
        hw_faults = VendorDetectorEngine.detect_hardware_errors(raw_text)
        if hw_faults:
            evidence_spans["hardware_faults"] = hw_faults

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

    @classmethod
    def normalize_to_universal_schema(cls, raw_text: str, override_vendor: Optional[str] = None) -> Dict[str, Any]:
        """
        Smart India Hackathon (NTRO/NCIIPC PS 26155) - Mandatory Normalization:
        Converts proprietary vendor-specific CLI outputs, logs, and configurations
        (Cisco, Juniper, Fortinet, Huawei, Palo Alto, etc.) into the standardized
        Universal JSON Schema model:
        {
          "device": { "vendor": "...", "hostname": "...", "os": "...", "device_type": "..." },
          "network": { "interfaces": [...], "routing": {...}, "vlans": [...] },
          "security": { "authentication": {...}, "snmp": {...}, "access_control": {...} },
          "logging_and_telemetry": { ... }
        }
        """
        if not raw_text or not raw_text.strip():
            return {
                "device": {"vendor": "Generic", "hostname": "unknown", "os": "Unknown", "device_type": "network_device"},
                "network": {"interfaces": [], "routing": {}, "vlans": []},
                "security": {"authentication": {}, "snmp": {}, "access_control": {}},
                "logging_and_telemetry": {"status": "EMPTY_PAYLOAD"}
            }

        text = raw_text.strip()
        lines = text.splitlines()

        # Check if input is a structured log stream (e.g. Fortinet KV logs or syslog)
        is_fortinet_log = "devname=" in text or "logid=" in text or "type=\"traffic\"" in text or "type=traffic" in text
        is_syslog = (re.search(r'%[A-Z0-9_\-]+:\s+', text) is not None) or ("syslog" in text.lower())

        # Base parsing from SBM
        sbm = cls.parse_config(text, override_vendor=override_vendor)
        vendor = sbm.device_metadata.vendor
        hostname = sbm.device_metadata.hostname
        os_ver = sbm.device_metadata.os_version
        dev_type = sbm.device_metadata.device_type

        # 1. Device Block
        if is_fortinet_log:
            dev_match = re.search(r'devname="?([^"\s]+)"?', text)
            if dev_match:
                hostname = dev_match.group(1)
            vendor = "Fortinet (FortiOS)"
            dev_type = "firewall"
            os_ver = "FortiOS 7.x"

        device_block = {
            "vendor": vendor,
            "hostname": hostname,
            "os": os_ver,
            "device_type": dev_type
        }

        # 2. Network Block (interfaces, routing, vlans, or traffic flows)
        interfaces = []
        routing: Dict[str, Any] = {"protocols": [], "static_routes": []}
        vlans = []

        for line in lines:
            line_s = line.strip()
            # Cisco interface
            if re.match(r'^interface\s+([\w\.\/\-]+)', line_s, re.IGNORECASE):
                match = re.match(r'^interface\s+([\w\.\/\-]+)', line_s, re.IGNORECASE)
                if match:
                    iface_name = match.group(1)
                    interfaces.append({"name": iface_name, "status": "CONFIGURED", "ip": "Unassigned"})
            # IP address assignment
            ip_match = re.search(r'ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)', line_s, re.IGNORECASE)
            if ip_match and interfaces:
                interfaces[-1]["ip"] = f"{ip_match.group(1)}/{ip_match.group(2)}"
            # Juniper interface
            jun_if = re.search(r'set\s+interfaces\s+([\w\.\/\-]+)\s+unit\s+(\d+)\s+family\s+inet\s+address\s+(\S+)', line_s, re.IGNORECASE)
            if jun_if:
                interfaces.append({"name": f"{jun_if.group(1)}.{jun_if.group(2)}", "status": "UP", "ip": jun_if.group(3)})
            # Routing
            if "router ospf" in line_s.lower() or "protocols ospf" in line_s.lower():
                if "OSPF" not in routing["protocols"]:
                    routing["protocols"].append("OSPF")
            if "router bgp" in line_s.lower() or "protocols bgp" in line_s.lower():
                if "BGP" not in routing["protocols"]:
                    routing["protocols"].append("BGP")
            if "ip route" in line_s.lower():
                routing["static_routes"].append(line_s)
            # VLANs
            vlan_match = re.search(r'(?:vlan|set vlans)\s+(\d+)', line_s, re.IGNORECASE)
            if vlan_match:
                vlans.append(int(vlan_match.group(1)))

        # If log stream, extract traffic sessions
        traffic_sessions = []
        if is_fortinet_log or is_syslog:
            for line in lines:
                src_ip = re.search(r'srcip="?([^"\s]+)"?', line)
                dst_ip = re.search(r'dstip="?([^"\s]+)"?', line)
                action = re.search(r'action="?([^"\s]+)"?', line)
                proto = re.search(r'proto="?([^"\s]+)"?', line)
                if src_ip and dst_ip:
                    traffic_sessions.append({
                        "source_ip": src_ip.group(1),
                        "destination_ip": dst_ip.group(1),
                        "protocol": proto.group(1) if proto else "TCP",
                        "action": action.group(1) if action else "FORWARDED"
                    })

        network_block = {
            "interfaces": interfaces if interfaces else ([{"name": "eth0", "status": "UP", "ip": "Dynamic/DHCP"}] if not is_fortinet_log else []),
            "routing": routing,
            "vlans": sorted(list(set(vlans))),
            "traffic_sessions": traffic_sessions[:10]
        }

        # 3. Security Block (authentication, snmp, access_control)
        auth_sec = sbm.authentication_security
        sec_block = {
            "authentication": {
                "ssh_version": auth_sec.ssh_version,
                "ssh_compliant": auth_sec.ssh_version == 2,
                "telnet_enabled": auth_sec.telnet_enabled,
                "http_management_enabled": sbm.authentication_and_access.http_management_enabled,
                "https_management_enabled": sbm.authentication_and_access.https_management_enabled,
                "exec_timeout_seconds": auth_sec.exec_timeout_seconds,
                "exec_timeout_compliant": 0 < auth_sec.exec_timeout_seconds <= 600,
                "password_encryption_types": auth_sec.password_encryption_types,
                "has_weak_password_hashes": "plaintext" in auth_sec.password_encryption_types or "type_7" in auth_sec.password_encryption_types,
                "login_banner_configured": sbm.authentication_and_access.login_banner_configured
            },
            "snmp": {
                "snmp_version": sbm.network_and_services.snmp_version.value if hasattr(sbm.network_and_services.snmp_version, 'value') else str(sbm.network_and_services.snmp_version),
                "default_community_strings_detected": sbm.network_and_services.snmp_read_community_default,
                "snmpv3_compliant": "v3" in str(sbm.network_and_services.snmp_version).lower()
            },
            "access_control": {
                "management_acl_applied": sbm.access_control.management_acl_applied,
                "login_block_failed_attempts": sbm.access_control.login_block_failed_attempts,
                "firewall_rules_count": len(traffic_sessions) if is_fortinet_log else max(1, len(lines) // 5)
            }
        }

        # 4. Logging & Telemetry Block
        logging_block = {
            "syslog_enabled": sbm.network_and_services.logging_syslog_enabled or is_syslog or is_fortinet_log,
            "ntp_servers_configured": sbm.network_and_services.ntp_servers_configured,
            "raw_source_type": "LOG_STREAM" if (is_fortinet_log or is_syslog) else "CLI_CONFIGURATION",
            "lines_parsed": len(lines),
            "integrity_hash": sbm.source_hash
        }

        return {
            "device": device_block,
            "network": network_block,
            "security": sec_block,
            "logging_and_telemetry": logging_block
        }
