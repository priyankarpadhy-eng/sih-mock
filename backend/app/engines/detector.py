"""
VectorNet Vendor & Operating System Detector Engine
====================================================
Tier 1: High-confidence Header / Banner Signature Regex Matcher.
Tier 2: Fallback NLP Keyword Frequency Classifier for Device Type & Vendor.
"""

import re
from typing import Any, Dict, List, Optional


class VendorDetectorEngine:
    """
    Multi-tiered Vendor Detection & Signature Engine for VectorNet.
    Tier 1: Header/Banner Regex Matcher (High Confidence)
    Tier 2: Fallback NLP / Keyword Frequency Classifier for Device Type & Vendor
    """

    HEADER_SIGNATURES = [
        {
            "vendor": "Cisco Systems",
            "os_version": "IOS / IOS-XE",
            "patterns": [
                r"version\s+1[56]\.\d+",
                r"building\s+configuration\.\.\.",
                r"ip\s+cef",
                r"line\s+vty",
                r"cucme",
                r"telephony-service"
            ],
            "default_device_type": "router"
        },
        {
            "vendor": "Juniper Networks",
            "os_version": "JunOS",
            "patterns": [
                r"set\s+system\s+services",
                r"set\s+system\s+host-name",
                r"groups\s+\{",
                r"apply-groups",
                r"junos"
            ],
            "default_device_type": "firewall"
        },
        {
            "vendor": "Palo Alto Networks",
            "os_version": "PAN-OS",
            "patterns": [
                r"set\s+deviceconfig\s+system",
                r"deviceconfig",
                r"set\s+shared\s+log-settings",
                r"pan-os",
                r"paloalto"
            ],
            "default_device_type": "firewall"
        },
        {
            "vendor": "Fortinet",
            "os_version": "FortiOS",
            "patterns": [
                r"config\s+system\s+global",
                r"config\s+system\s+interface",
                r"config\s+system",
                r"config\s+log\s+syslogd",
                r"config\s+firewall",
                r"admintimeout",
                r"allowaccess",
                r"admin-https-redirect",
                r"fortigate",
                r"fortinet",
                r"fortios",
                r"fg-sase",
                r"fgt-",
                r"fg-"
            ],
            "default_device_type": "firewall"
        },
        {
            "vendor": "Huawei",
            "os_version": "VRP",
            "patterns": [
                r"sysname",
                r"display\s+current-configuration",
                r"super\s+password",
                r"huawei",
                r"vrp",
                r"radius-server\s+template"
            ],
            "default_device_type": "router"
        },
        {
            "vendor": "Arista Networks",
            "os_version": "EOS",
            "patterns": [
                r"management\s+api\s+http-commands",
                r"arista\s+eos"
            ],
            "default_device_type": "switch"
        },
        {
            "vendor": "MikroTik",
            "os_version": "RouterOS",
            "patterns": [
                r"/ip\s+service",
                r"/system\s+identity"
            ],
            "default_device_type": "router"
        },
        {
            "vendor": "Sonic Foundation",
            "os_version": "SONiC OS",
            "patterns": [
                r"sonic-cli",
                r"openconfig-system",
                r"device_metadata",
                r"hwsku",
                r"torrouter"
            ],
            "default_device_type": "whitebox"
        },
        {
            "vendor": "Amazon Web Services",
            "os_version": "AWS Cloud SG",
            "patterns": [
                r"security_group",
                r"ippermissions",
                r"ip_permissions",
                r"ipranges",
                r"groupid",
                r"sg-[0-9a-f]+"
            ],
            "default_device_type": "cloud_sg"
        }
    ]

    @classmethod
    def detect_hardware_errors(cls, raw_text: str) -> List[Dict[str, Any]]:
        """
        Hardware & Telemetry Error Detector:
        Scans configuration streams, CLI diagnostics (show env, dmesg, tech-support),
        and syslog streams for hardware faults:
        - Fan & PSU failures
        - Thermal & overheating alerts
        - Memory ECC & CPU Machine Check (MCE)
        - Physical interface CRC, link flapping, and SFP transceiver errors
        - Storage corruption & flash NVRAM errors
        - Kernel panic & watchdog events
        """
        if not raw_text:
            return []

        errors: List[Dict[str, Any]] = []
        lines = raw_text.splitlines()

        hw_patterns = [
            (
                "POWER_AND_FAN",
                r"(%ENVMON-3-FAN_FAILED|fan\s+(?:tray\s+)?failed|fan\s+failure|power-supply-failed|psu\s+fault|fan\s+fault|fan\s+speed\s+below\s+threshold|psu\s+\d+\s+absent|power\s+supply\s+failure|redundant\s+psu\s+lost)",
                "CRITICAL",
                "Power supply or chassis cooling fan failure detected. Immediate physical chassis inspection required."
            ),
            (
                "THERMAL_ALERT",
                r"(temperature\s+(?:critical|alarm|high|exceeded)|thermal\s+shutdown|overheat\s+warning|sensor\s+temp\s+critical|junction\s+temp\s+high)",
                "CRITICAL",
                "Chassis junction temperature exceeds threshold. High risk of thermal throttling or emergency hardware shutdown."
            ),
            (
                "CPU_AND_MEMORY",
                r"(Machine\s+Check\s+Exception|MCE|ECC\s+(?:uncorrectable|error)|memory\s+parity\s+error|DIMM\s+(?:fault|error)|Out\s+of\s+memory:\s+Kill\s+process|OOM-killer|malloc\s+failure|kernel:\s+\[Hardware\s+Error\])",
                "CRITICAL",
                "Uncorrectable memory parity or CPU Machine Check hardware anomaly. Memory module replacement indicated."
            ),
            (
                "PHYSICAL_INTERFACE_CRC",
                r"(\b\d+\s+CRC\b|\bCRC\s+error|input\s+errors\s+CRC|link\s+flapping|carrier\s+transitions\s+\d+|PHY\s+failure|SFP\s+(?:rx\s+power\s+low|transceiver\s+error|fault)|loss\s+of\s+signal|loss-of-signal)",
                "HIGH",
                "Physical layer framing corruption or optical SFP degradation. Verify fiber cable, optic transceiver, and duplex settings."
            ),
            (
                "STORAGE_CORRUPTION",
                r"(NVRAM\s+checksum\s+failed|compact\s+flash\s+read\s+error|filesystem\s+read-only|bad\s+sector|disk\s+I/O\s+error|corrupted\s+filesystem|flash:\s+write\s+error)",
                "HIGH",
                "Non-volatile storage or boot flash corruption. File system check and backup restoration recommended."
            ),
            (
                "KERNEL_CRASH",
                r"(kernel\s+panic|system\s+restarted\s+by\s+bus\s+error|watchdog\s+timer\s+expired|segmentation\s+fault|stack\s+trace:\s+kernel|crashdump\s+generated)",
                "CRITICAL",
                "Operating system kernel panic or hardware watchdog reset. Review crashdump and firmware stability."
            )
        ]

        for line_no, raw_line in enumerate(lines, 1):
            line_str = raw_line.strip()
            if not line_str or line_str.startswith("#"):
                continue

            for cat, pattern, severity, desc in hw_patterns:
                m = re.search(pattern, line_str, re.IGNORECASE)
                if m:
                    matched_snippet = m.group(1)
                    errors.append({
                        "category": cat,
                        "severity": severity,
                        "line_number": line_no,
                        "line_content": line_str[:120],
                        "matched_token": matched_snippet,
                        "description": desc
                    })

        return errors

    @classmethod
    def detect_vendor(cls, raw_config_text: str) -> Dict[str, Any]:
        text_lower = raw_config_text.lower()

        # Tier 1: Header / Banner Signature Matching (Max Match Scoring)
        best_sig = None
        max_matches = 0

        for sig in cls.HEADER_SIGNATURES:
            matches = 0
            for pat in sig["patterns"]:
                if re.search(pat, text_lower, re.IGNORECASE):
                    matches += 1
            if matches > max_matches:
                max_matches = matches
                best_sig = sig

        if best_sig and max_matches >= 1:
            sig = best_sig
            device_type = sig["default_device_type"]
            if "telephony-service" in text_lower or "cucme" in text_lower or "voice port" in text_lower or "stcapp" in text_lower:
                device_type = "voip_gateway"
            elif "switchport" in text_lower or "vlan" in text_lower:
                device_type = "switch"
            elif "fortigate" in text_lower or "admintimeout" in text_lower or "firewall" in text_lower:
                device_type = "firewall"
            
            os_ver = sig["os_version"]
            ver_match = re.search(r"version\s+([\d\.\(\)a-zA-Z]+)", raw_config_text, re.IGNORECASE)
            if ver_match:
                os_ver = f"{sig['os_version']} ({ver_match.group(1)})"

            confidence = min(0.75 + (max_matches * 0.08), 0.99)
            return {
                "vendor": sig["vendor"],
                "os_version": os_ver,
                "device_type": device_type,
                "confidence": confidence,
                "detection_method": "header_signature"
            }

        # Tier 2: Fallback NLP / Keyword Frequency Classifier
        keywords_router = ["ip route", "bgp", "ospf", "interface gigabitethernet", "router", "sysname"]
        keywords_switch = ["switchport", "spanning-tree", "vlan", "trunk"]
        keywords_firewall = ["security-zone", "firewall", "nat", "policy", "access-group", "permit", "admintimeout", "allowaccess"]
        keywords_voip = ["voip", "sip", "dial-peer", "telephony", "sccp"]

        score_router = sum(text_lower.count(k) for k in keywords_router)
        score_switch = sum(text_lower.count(k) for k in keywords_switch)
        score_firewall = sum(text_lower.count(k) for k in keywords_firewall)
        score_voip = sum(text_lower.count(k) for k in keywords_voip)

        max_score = max(score_router, score_switch, score_firewall, score_voip)
        
        predicted_type = "router"
        if max_score > 0:
            if max_score == score_voip:
                predicted_type = "voip_gateway"
            elif max_score == score_firewall:
                predicted_type = "firewall"
            elif max_score == score_switch:
                predicted_type = "switch"
            elif max_score == score_router:
                predicted_type = "router"

        # Vendor keyword lookup
        predicted_vendor = "Generic Network Device"
        if "cisco" in text_lower or "line vty" in text_lower or "enable secret" in text_lower:
            predicted_vendor = "Cisco Systems"
        elif "juniper" in text_lower or "junos" in text_lower or "set system" in text_lower:
            predicted_vendor = "Juniper Networks"
        elif "palo" in text_lower or "pan-os" in text_lower or "deviceconfig" in text_lower:
            predicted_vendor = "Palo Alto Networks"
        elif "forti" in text_lower or "admintimeout" in text_lower or "config system" in text_lower or "allowaccess" in text_lower:
            predicted_vendor = "Fortinet"
        elif "huawei" in text_lower or "sysname" in text_lower or "vrp" in text_lower:
            predicted_vendor = "Huawei"

        return {
            "vendor": predicted_vendor,
            "os_version": "Unknown OS",
            "device_type": predicted_type,
            "confidence": 0.70 if max_score > 0 else 0.45,
            "detection_method": "fallback_nlp_classifier"
        }


def detect_vendor(raw_config_text: str) -> Dict[str, Any]:
    """Helper convenience function for vendor detection."""
    return VendorDetectorEngine.detect_vendor(raw_config_text)
