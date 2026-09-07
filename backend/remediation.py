from typing import Dict

class RemediationGenerator:
    """
    Constructs vendor-specific CLI remediation playbooks to resolve compliance failures.
    Supports Cisco IOS/NX-OS, Juniper JunOS, Palo Alto PAN-OS, Fortinet FortiOS, and Arista EOS.
    """

    REMEDIATION_MATRIX = {
        "NIST-AC-12": {
            "Cisco Systems (IOS / IOS-XE)": "line vty 0 15\n exec-timeout 10 0\nexit",
            "Cisco Systems (NX-OS)": "line vty\n exec-timeout 10\nexit",
            "Juniper Networks (JunOS)": "set system login idle-timeout 10",
            "Palo Alto Networks (PAN-OS)": "set deviceconfig system idle-timeout 10",
            "Fortinet (FortiOS)": "config system global\n set admintimeout 10\nend",
            "Arista Networks (EOS)": "line vty\n exec-timeout 10\nexit",
            "Generic / Unrecognized": "# Configure terminal session idle timeout to <= 600 seconds (10 mins)"
        },
        "NIST-IA-5": {
            "Cisco Systems (IOS / IOS-XE)": "enable algorithm-type sha256 secret <SECURE_PASSWORD>\nservice password-encryption",
            "Cisco Systems (NX-OS)": "username admin password sha512 <SECURE_PASSWORD>",
            "Juniper Networks (JunOS)": "set system root-authentication plain-text-password-sha256",
            "Palo Alto Networks (PAN-OS)": "set mgt-config users admin password",
            "Fortinet (FortiOS)": "config system admin\n edit admin\n set password <SECURE_PASSWORD>\nend",
            "Arista Networks (EOS)": "username admin secret sha512 <SECURE_PASSWORD>",
            "Generic / Unrecognized": "# Enforce SHA-256 or SHA-512 password hashing algorithm"
        },
        "NIST-SC-8": {
            "Cisco Systems (IOS / IOS-XE)": "no ip http server\nline vty 0 15\n transport input ssh\nexit",
            "Cisco Systems (NX-OS)": "no feature telnet\nno feature http-server",
            "Juniper Networks (JunOS)": "set system services telnet disable\nset system services web-management http disable",
            "Palo Alto Networks (PAN-OS)": "set deviceconfig system service disable-telnet yes\nset deviceconfig system service disable-http yes",
            "Fortinet (FortiOS)": "config system interface\n edit port1\n unset allowaccess telnet http\nend",
            "Arista Networks (EOS)": "no management api http-commands\nline vty\n transport input ssh\nexit",
            "Generic / Unrecognized": "# Disable cleartext Telnet and HTTP management interfaces"
        },
        "CIS-1.1": {
            "Cisco Systems (IOS / IOS-XE)": "ip domain-name local.net\ncrypto key generate rsa modulus 2048\nip ssh version 2",
            "Cisco Systems (NX-OS)": "feature ssh\nfeature ssh server version 2",
            "Juniper Networks (JunOS)": "set system services ssh protocol-version v2",
            "Palo Alto Networks (PAN-OS)": "set deviceconfig system ssh-cipher ciphers aes256-gcm",
            "Fortinet (FortiOS)": "config system global\n set ssh-cbc-cipher disable\n set ssh-kex-algo diffie-hellman-group14-sha1\nend",
            "Arista Networks (EOS)": "ip ssh version 2",
            "Generic / Unrecognized": "# Force SSH version 2 protocol execution"
        },
        "CIS-2.2": {
            "Cisco Systems (IOS / IOS-XE)": "no snmp-server community public\nno snmp-server community private\nsnmp-server group SECGROUP v3 auth privacy",
            "Cisco Systems (NX-OS)": "no snmp-server community public\nsnmp-server user admin v3 auth sha <PASSWORD> priv aes128 <PRIV_KEY>",
            "Juniper Networks (JunOS)": "delete snmp community public\nset snmp v3 usm local-engine user admin authentication-sha password <PASS>",
            "Palo Alto Networks (PAN-OS)": "set deviceconfig system snmp-setting version v3",
            "Fortinet (FortiOS)": "config system snmp community\n delete 1\nend\nconfig system snmp user\n edit admin_v3\n set security-level auth-priv\nend",
            "Arista Networks (EOS)": "no snmp-server community public\nsnmp-server user admin v3 auth sha <PASSWORD> priv aes <KEY>",
            "Generic / Unrecognized": "# Enforce SNMPv3 with AuthPriv encryption and purge default community strings"
        },
        "STIG-NET-002": {
            "Cisco Systems (IOS / IOS-XE)": "banner login ^C\nUNAUTHORIZED ACCESS TO THIS TACTICAL SYSTEM IS STRICTLY PROHIBITED AND MONITORED.\n^C",
            "Cisco Systems (NX-OS)": "banner motd ^C\nRESTRICTED DEFENSE NETWORK - AUTHORIZED PERSONNEL ONLY\n^C",
            "Juniper Networks (JunOS)": "set system login message \"UNAUTHORIZED ACCESS PROHIBITED. ALL ACTIVITIES LOGGED.\"",
            "Palo Alto Networks (PAN-OS)": "set deviceconfig system login-banner \"WARNING: RESTRICTED GOVERNMENT SYSTEM\"",
            "Fortinet (FortiOS)": "config system global\n set pre-login-banner enable\n set login-timestamp enable\nend",
            "Arista Networks (EOS)": "banner motd ^C\nSECURITY NOTICE: AUTHORIZED USE ONLY\n^C",
            "Generic / Unrecognized": "# Configure mandatory security warning banner"
        },
        "ISO-27001-A12": {
            "Cisco Systems (IOS / IOS-XE)": "logging host 10.0.100.50\nlogging trap informational\nlogging source-interface GigabitEthernet0/0",
            "Cisco Systems (NX-OS)": "logging server 10.0.100.50 6 use-vrf default",
            "Juniper Networks (JunOS)": "set system syslog host 10.0.100.50 any info",
            "Palo Alto Networks (PAN-OS)": "set shared log-settings syslog SEC-SYSLOG server SYSLOG-01 server 10.0.100.50",
            "Fortinet (FortiOS)": "config log syslogd setting\n set status enable\n set server 10.0.100.50\nend",
            "Arista Networks (EOS)": "logging host 10.0.100.50",
            "Generic / Unrecognized": "# Forward security logs to remote centralized syslog server"
        }
    }

    @classmethod
    def get_remediation(cls, rule_id: str, vendor: str) -> Dict[str, str]:
        rule_playbooks = cls.REMEDIATION_MATRIX.get(rule_id, {})
        
        # Exact vendor match
        if vendor in rule_playbooks:
            snippet = rule_playbooks[vendor]
        else:
            # Substring match
            matched_snippet = None
            for key, val in rule_playbooks.items():
                if key != "Generic / Unrecognized" and (key.split(" ")[0].lower() in vendor.lower()):
                    matched_snippet = val
                    break
            snippet = matched_snippet if matched_snippet else rule_playbooks.get("Generic / Unrecognized", "# Consult vendor documentation for rule remediation")

        return {
            "target_vendor": vendor,
            "rule_id": rule_id,
            "remediation_cli": snippet
        }
