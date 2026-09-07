from typing import Dict, Any

class RemediationGenerator:
    """
    Vendor CLI Remediation Script Generator for Sentinel-Net.
    Generates exact syntax-correct CLI fix sequences and rollback plans
    under a strict 'Proposal-Only' safety model (SIH PS 26155).
    """

    @classmethod
    def generate_proposal(cls, rule_id: str, vendor: str) -> Dict[str, Any]:
        vendor_l = vendor.lower()
        fix_script = cls.generate_fix(rule_id, vendor)
        rollback_script = "! Rollback: Restore previous state\n"
        verification_cmd = "show running-config"
        prereqs = "Verify console/out-of-band access before applying changes to live management planes."

        if "cisco" in vendor_l:
            if rule_id in ["NIST-AC-12", "CIS-1.1.2"]:
                rollback_script = "line vty 0 4\n transport input telnet ssh\n exec-timeout 0 0\nexit"
                verification_cmd = "show running-config | section line vty"
                prereqs = "Ensure an active SSH session is operational before terminating Telnet."
            elif rule_id == "DISA-IA-5":
                rollback_script = "username b password 7 0822455D0A16\nno enable secret"
                verification_cmd = "show running-config | include username|secret"
                prereqs = "Store emergency local break-glass administrative credentials in secret vault."
            elif rule_id == "NIST-AC-2":
                rollback_script = "line vty 0 4\n no access-class MGMT-ACL in\nno ip access-list standard MGMT-ACL"
                verification_cmd = "show ip access-lists MGMT-ACL"
                prereqs = "Confirm management IP subnet is explicitly allowed in ACL to prevent lockout."
            elif rule_id == "DISA-AC-7":
                rollback_script = "no login block-for"
                verification_cmd = "show login"
                prereqs = "Ensure administrative subnet is exempted or quiet-mode access list is bound."

        elif "juniper" in vendor_l:
            if rule_id in ["NIST-AC-12", "CIS-1.1.2"]:
                rollback_script = "delete system login idle-timeout\ndelete system services ssh protocol-version\nset system services telnet"
                verification_cmd = "show configuration system services"
            prereqs = "Commit with confirmed (commit confirmed 5) before finalizing configuration."

        elif "palo" in vendor_l:
            rollback_script = "delete deviceconfig system idle-timeout\nset deviceconfig system service disable-telnet no"
            verification_cmd = "show config running | match idle-timeout"
            prereqs = "Validate admin management profile allows HTTPS/SSH on management interface."

        elif "forti" in vendor_l:
            rollback_script = "config system global\n    set admintimeout 0\nend"
            verification_cmd = "get system global | grep admintimeout"
            prereqs = "Ensure trusted host IP configuration is verified before applying timeout."

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
        vendor_l = vendor.lower()

        if "cisco" in vendor_l:
            if rule_id in ["NIST-AC-12", "CIS-1.1.2"]:
                return (
                    "! Fix 1: Disable Telnet & Set Session Timeout (NIST AC-12 & CIS 1.1.2)\n"
                    "line vty 0 4\n"
                    " transport input ssh\n"
                    " exec-timeout 10 0\n"
                    "exit"
                )
            elif rule_id == "DISA-IA-5":
                return (
                    "! Fix 2: Upgrade Weak Type 7 Password Hashes to Strong Secret Hashes\n"
                    "no username b\n"
                    "username b privilege 15 secret 4 <NEW_STRONG_SECRET>\n"
                    "enable secret 4 <NEW_ENABLE_SECRET>"
                )
            elif rule_id == "NIST-AC-2":
                return (
                    "! Fix 3: Apply Management Access Control List to VTY lines\n"
                    "ip access-list standard MGMT-ACL\n"
                    " permit 10.0.100.0 0.0.0.255\n"
                    "line vty 0 4\n"
                    " access-class MGMT-ACL in"
                )
            elif rule_id == "DISA-AC-7":
                return (
                    "! Fix 4: Configure Brute-Force Rate-Limiting & Lockout\n"
                    "login block-for 300 attempts 3 within 60"
                )

        if "juniper" in vendor_l:
            if rule_id in ["NIST-AC-12", "CIS-1.1.2"]:
                return (
                    "# Juniper JunOS Remediation\n"
                    "set system login idle-timeout 10\n"
                    "set system services ssh protocol-version v2\n"
                    "set system services telnet disable"
                )
            elif rule_id == "DISA-IA-5":
                return "set system root-authentication plain-text-password-with-sha512"

        if "palo" in vendor_l:
            return (
                "# Palo Alto PAN-OS Remediation\n"
                "set deviceconfig system idle-timeout 10\n"
                "set deviceconfig system service disable-telnet yes"
            )

        if "forti" in vendor_l:
            return (
                "# Fortinet FortiOS Remediation\n"
                "config system global\n"
                "    set admintimeout 10\n"
                "end"
            )

        # Default Cisco IOS benchmark remediation output
        return (
            "[REMEDIATION SCRIPT FOR CISCO IOS]\n"
            "! Fix 1: Disable Telnet & Set Session Timeout\n"
            "line vty 0 4\n"
            " transport input ssh\n"
            " exec-timeout 10 0\n"
            "!\n"
            "! Fix 2: Upgrade Weak Password Hashes\n"
            "no username b\n"
            "username b privilege 15 secret 4 <NEW_STRONG_SECRET>"
        )

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
