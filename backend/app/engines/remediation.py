"""
VectorNet Remediation Playbook Generator Engine
===============================================
Generates vendor-specific CLI configuration correction sequences, verification
commands, and atomic rollback playbooks under a strict 'Proposal-Only' safety model.
Aligned with SIH Problem Statement 26155.
"""

from typing import Any, Dict


class RemediationGenerator:
    """
    Vendor CLI Remediation Script Generator for VectorNet.
    Generates exact syntax-correct CLI fix sequences and rollback plans
    under a strict 'Proposal-Only' safety model (SIH PS 26155).
    """

    @classmethod
    def generate_proposal(cls, rule_id: str, vendor: str) -> Dict[str, Any]:
        vendor_l = vendor.lower() if vendor else "generic"
        fix_script = cls.generate_fix(rule_id, vendor)
        rollback_script = cls.generate_rollback(rule_id, vendor)
        verification_cmd = cls.generate_verification(rule_id, vendor)
        prereqs = cls.generate_prerequisites(rule_id, vendor)

        return {
            "proposal_status": "proposal-only",
            "script": fix_script,
            "remediation_cli": fix_script,
            "rollback": rollback_script,
            "verification_cmd": verification_cmd,
            "prerequisites": prereqs,
            "warning": "PROPOSAL ONLY: Must be reviewed by NetOps before live deployment. Do not auto-apply without staging verification."
        }

    @classmethod
    def generate_fix(cls, rule_id: str, vendor: str) -> str:
        vendor_l = vendor.lower() if vendor else "generic"
        rid = rule_id.upper()

        # -------------------------------------------------------------
        # 1. Fortinet FortiOS Remediation Playbooks
        # -------------------------------------------------------------
        if "forti" in vendor_l:
            if "AC-12" in rid or "CIS-1.1.2" in rid:
                return (
                    "# FortiOS CLI: Enforce 10-Minute Admin Session Idle Timeout\n"
                    "config system global\n"
                    "    set admintimeout 10\n"
                    "end"
                )
            elif "SC-8" in rid or "TELNET" in rid or "PLAINTEXT" in rid:
                return (
                    "# FortiOS CLI: Disable Insecure HTTP/Telnet Management Ports\n"
                    "config system interface\n"
                    "    edit \"port1\"\n"
                    "        set allowaccess ping https ssh\n"
                    "    next\n"
                    "end\n"
                    "config system global\n"
                    "    set admin-https-redirect enable\n"
                    "    set admin-sport 8443\n"
                    "end"
                )
            elif "IA-5" in rid or "PASSWORD" in rid:
                return (
                    "# FortiOS CLI: Upgrade Administrative Credentials & Enable Pre-Login Banner\n"
                    "config system global\n"
                    "    set pre-login-banner enable\n"
                    "end\n"
                    "config system admin\n"
                    "    edit \"admin\"\n"
                    "        set password <STRONG_COMPLIANT_PASSWORD>\n"
                    "    next\n"
                    "end"
                )
            elif "AC-7" in rid or "LOCKOUT" in rid:
                return (
                    "# FortiOS CLI: Configure Admin Brute-Force Lockout Threshold\n"
                    "config system global\n"
                    "    set admin-lockout-threshold 3\n"
                    "    set admin-lockout-duration 300\n"
                    "end"
                )
            elif "SNMP" in rid or "CIS-1.2.1" in rid:
                return (
                    "# FortiOS CLI: Delete Default Insecure Public SNMP Community\n"
                    "config system snmp community\n"
                    "    delete 1\n"
                    "end"
                )
            elif "A12" in rid or "SYSLOG" in rid or "LOG" in rid:
                return (
                    "# FortiOS CLI: Enable Remote Syslog Telemetry Forwarding\n"
                    "config log syslogd setting\n"
                    "    set status enable\n"
                    "    set server \"10.0.100.50\"\n"
                    "    set mode udp\n"
                    "    set port 514\n"
                    "end"
                )
            elif "HW-" in rid or "HARDWARE" in rid:
                return (
                    "# FortiOS CLI: Operational Hardware & Chassis Diagnostics\n"
                    "diagnose hardware sysinfo\n"
                    "get system status\n"
                    "diagnose hardware test suite\n"
                    "diagnose sys top 2 50"
                )
            else:
                return (
                    f"# FortiOS CLI: Apply Security Hardening Policy ({rule_id})\n"
                    "config system global\n"
                    "    set admintimeout 10\n"
                    "    set admin-https-redirect enable\n"
                    "end"
                )

        # -------------------------------------------------------------
        # 2. Juniper Networks JunOS Remediation Playbooks
        # -------------------------------------------------------------
        elif "juniper" in vendor_l:
            if "AC-12" in rid or "CIS-1.1.2" in rid:
                return (
                    "# JunOS CLI: Configure 10-Minute CLI Inactivity Timeout\n"
                    "set system login idle-timeout 10\n"
                    "commit check"
                )
            elif "SC-8" in rid or "TELNET" in rid:
                return (
                    "# JunOS CLI: Terminate Plaintext Telnet and Enforce SSHv2\n"
                    "delete system services telnet\n"
                    "set system services ssh protocol-version v2\n"
                    "commit check"
                )
            elif "IA-5" in rid:
                return (
                    "# JunOS CLI: Upgrade Root Authentication Hash to SHA-512\n"
                    "set system root-authentication plain-text-password-with-sha512\n"
                    "commit check"
                )
            elif "SNMP" in rid:
                return (
                    "# JunOS CLI: Remove Default Public SNMP Community\n"
                    "delete snmp community public\n"
                    "commit check"
                )
            elif "A12" in rid or "SYSLOG" in rid:
                return (
                    "# JunOS CLI: Configure Centralized Syslog Server Forwarding\n"
                    "set system syslog host 10.0.100.50 any notice\n"
                    "commit check"
                )
            elif "HW-" in rid or "HARDWARE" in rid:
                return (
                    "# JunOS CLI: Chassis Environmental & Hardware Alarm Diagnostics\n"
                    "show chassis environment\n"
                    "show chassis alarms\n"
                    "show chassis hardware detail\n"
                    "show system storage"
                )
            else:
                return (
                    f"# JunOS CLI: Security Baseline Enforcement ({rule_id})\n"
                    "set system login idle-timeout 10\n"
                    "commit check"
                )

        # -------------------------------------------------------------
        # 3. Palo Alto Networks PAN-OS Remediation Playbooks
        # -------------------------------------------------------------
        elif "palo" in vendor_l:
            if "AC-12" in rid:
                return (
                    "# PAN-OS CLI: Enforce Idle Timeout on Management Console\n"
                    "set deviceconfig system idle-timeout 10"
                )
            elif "SC-8" in rid:
                return (
                    "# PAN-OS CLI: Disable Insecure Management Protocols\n"
                    "set deviceconfig system service disable-telnet yes\n"
                    "set deviceconfig system service disable-http yes"
                )
            elif "HW-" in rid or "HARDWARE" in rid:
                return (
                    "# PAN-OS CLI: Hardware Environmental Status\n"
                    "show system environmentals\n"
                    "show system info\n"
                    "show system disk-space"
                )
            else:
                return "set deviceconfig system idle-timeout 10"

        # -------------------------------------------------------------
        # 4. Huawei VRP Remediation Playbooks
        # -------------------------------------------------------------
        elif "huawei" in vendor_l:
            if "AC-12" in rid:
                return (
                    "# Huawei VRP: Configure User-Interface Idle Timeout\n"
                    "user-interface vty 0 4\n"
                    " idle-timeout 10 0\n"
                    "quit"
                )
            elif "SC-8" in rid:
                return (
                    "# Huawei VRP: Disable Telnet Server and Enable Stelnet (SSH)\n"
                    "undo telnet server enable\n"
                    "stelnet server enable"
                )
            elif "HW-" in rid or "HARDWARE" in rid:
                return (
                    "# Huawei VRP: Check Device Environmental Telemetry\n"
                    "display device\n"
                    "display environment\n"
                    "display cpu-usage\n"
                    "display memory-usage"
                )
            else:
                return "user-interface vty 0 4\n idle-timeout 10 0\nquit"

        # -------------------------------------------------------------
        # 5. Cisco Systems IOS / IOS-XE Remediation Playbooks
        # -------------------------------------------------------------
        else:
            if "AC-12" in rid or "CIS-1.1.2" in rid:
                return (
                    "! Cisco IOS: Disable Telnet & Set Session Idle Timeout (NIST AC-12)\n"
                    "line vty 0 4\n"
                    " transport input ssh\n"
                    " exec-timeout 10 0\n"
                    "exit"
                )
            elif "IA-5" in rid or "PASSWORD" in rid:
                return (
                    "! Cisco IOS: Replace Weak Reversible Password Hashes with Secret\n"
                    "no username b\n"
                    "username admin privilege 15 secret 4 <NEW_STRONG_SECRET>\n"
                    "enable secret 4 <NEW_ENABLE_SECRET>\n"
                    "service password-encryption"
                )
            elif "AC-2" in rid or "ACL" in rid:
                return (
                    "! Cisco IOS: Apply Management Access Control List to VTY Lines\n"
                    "ip access-list standard MGMT-ACL\n"
                    " permit 10.0.100.0 0.0.0.255\n"
                    "line vty 0 4\n"
                    " access-class MGMT-ACL in\n"
                    "exit"
                )
            elif "AC-7" in rid or "LOCKOUT" in rid:
                return (
                    "! Cisco IOS: Configure Brute-Force Rate-Limiting & Lockout\n"
                    "login block-for 300 attempts 3 within 60"
                )
            elif "SNMP" in rid:
                return (
                    "! Cisco IOS: Remove Default Read/Write SNMP Communities\n"
                    "no snmp-server community public\n"
                    "no snmp-server community private"
                )
            elif "A12" in rid or "SYSLOG" in rid:
                return (
                    "! Cisco IOS: Configure Remote Centralized Syslog Forwarding\n"
                    "logging host 10.0.100.50\n"
                    "logging trap informational\n"
                    "service timestamps log datetime msec"
                )
            elif "HW-" in rid or "HARDWARE" in rid:
                return (
                    "! Cisco IOS: Operational Hardware & Environmental Inspection\n"
                    "show environment table\n"
                    "show platform hardware status\n"
                    "show interfaces counters errors\n"
                    "show tech-support"
                )
            else:
                return (
                    "! Cisco IOS: Baseline Security Hardening\n"
                    "line vty 0 4\n"
                    " transport input ssh\n"
                    " exec-timeout 10 0\n"
                    "exit"
                )

    @classmethod
    def generate_rollback(cls, rule_id: str, vendor: str) -> str:
        vendor_l = vendor.lower() if vendor else "generic"
        rid = rule_id.upper()

        if "forti" in vendor_l:
            if "AC-12" in rid:
                return "config system global\n    set admintimeout 0\nend"
            elif "SC-8" in rid:
                return (
                    "config system interface\n"
                    "    edit \"port1\"\n"
                    "        set allowaccess ping https ssh http telnet\n"
                    "    next\n"
                    "end"
                )
            elif "IA-5" in rid:
                return "config system global\n    set pre-login-banner disable\nend"
            elif "AC-7" in rid:
                return "config system global\n    set admin-lockout-threshold 0\nend"
            elif "SNMP" in rid:
                return "config system snmp community\n    edit 1\n        set name \"public\"\n    next\nend"
            elif "A12" in rid or "SYSLOG" in rid:
                return "config log syslogd setting\n    set status disable\nend"
            else:
                return "# Rollback: No configuration state to revert"

        elif "juniper" in vendor_l:
            if "AC-12" in rid:
                return "delete system login idle-timeout\ncommit"
            elif "SC-8" in rid:
                return "set system services telnet\ncommit"
            elif "SNMP" in rid:
                return "set snmp community public authorization read-only\ncommit"
            else:
                return "rollback 1\ncommit"

        elif "palo" in vendor_l:
            return "delete deviceconfig system idle-timeout\ncommit"

        elif "huawei" in vendor_l:
            return "user-interface vty 0 4\n undo idle-timeout\nquit"

        else:
            if "AC-12" in rid:
                return "line vty 0 4\n transport input telnet ssh\n exec-timeout 0 0\nexit"
            elif "IA-5" in rid:
                return "username b password 7 0822455D0A16\nno enable secret"
            elif "AC-2" in rid:
                return "line vty 0 4\n no access-class MGMT-ACL in\nexit\nno ip access-list standard MGMT-ACL"
            elif "AC-7" in rid:
                return "no login block-for"
            elif "SNMP" in rid:
                return "snmp-server community public RO"
            else:
                return "! Rollback: Restore previous state"

    @classmethod
    def generate_verification(cls, rule_id: str, vendor: str) -> str:
        vendor_l = vendor.lower() if vendor else "generic"

        if "forti" in vendor_l:
            return "get system global | grep admintimeout"
        elif "juniper" in vendor_l:
            return "show configuration system | display set"
        elif "palo" in vendor_l:
            return "show config running | match idle-timeout"
        elif "huawei" in vendor_l:
            return "display current-configuration | include idle-timeout"
        else:
            return "show running-config | section line vty"

    @classmethod
    def generate_prerequisites(cls, rule_id: str, vendor: str) -> str:
        vendor_l = vendor.lower() if vendor else "generic"
        if "forti" in vendor_l:
            return "Ensure administrative access is active over HTTPS/SSH before adjusting interface allowaccess."
        elif "juniper" in vendor_l:
            return "Always verify configuration syntax using 'commit check' before applying."
        elif "palo" in vendor_l:
            return "Verify management profile permits HTTPS and ping before committing."
        else:
            return "Verify console or out-of-band access before modifying management access."

    @classmethod
    def get_full_cisco_remediation_script(cls) -> str:
        return (
            "[REMEDIATION SCRIPT FOR CISCO IOS]\n"
            "! Fix 1: Disable Telnet & Set Session Timeout\n"
            "line vty 0 4\n"
            " transport input ssh\n"
            " exec-timeout 10 0\n"
            "!\n"
            "! Fix 2: Upgrade Weak Password Hashes\n"
            "no username b\n"
            "username b privilege 15 secret 4 <NEW_STRONG_SECRET>\n"
            "!\n"
            "! Fix 3: Apply Access Control List\n"
            "ip access-list standard MGMT-ACL\n"
            " permit 10.0.100.0 0.0.0.255\n"
            "line vty 0 4\n"
            " access-class MGMT-ACL in\n"
            "!\n"
            "! Fix 4: Configure Login Failed Attempts Lockout\n"
            "login block-for 300 attempts 3 within 60"
        )
