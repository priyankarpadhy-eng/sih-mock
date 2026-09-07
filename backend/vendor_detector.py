import re
from typing import Dict, Any

class VendorDetectorEngine:
    """
    Multi-tiered Vendor Detection & Signature Engine for Sentinel-Net.
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
                r"config\s+log\s+syslogd",
                r"fortigate"
            ],
            "default_device_type": "firewall"
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
            # Infer device type specifically for Cisco VoIP Gateway (CUCME benchmark)
            device_type = sig["default_device_type"]
            if "telephony-service" in text_lower or "cucme" in text_lower or "voice port" in text_lower or "stcapp" in text_lower:
                device_type = "voip_gateway"
            elif "switchport" in text_lower or "vlan" in text_lower:
                device_type = "switch"
            
            # Extract exact OS version string if available
            os_ver = sig["os_version"]
            ver_match = re.search(r"version\s+([\d\.\(\)a-zA-Z]+)", raw_config_text, re.IGNORECASE)
            if ver_match:
                os_ver = f"{sig['os_version']} ({ver_match.group(1)})"

            confidence = min(0.70 + (max_matches * 0.10), 0.99)
            return {
                "vendor": sig["vendor"],
                "os_version": os_ver,
                "device_type": device_type,
                "confidence": confidence,
                "detection_method": "header_signature"
            }

        # Tier 2: Fallback NLP / Keyword Frequency Classifier
        keywords_router = ["ip route", "bgp", "ospf", "interface gigabitethernet", "router"]
        keywords_switch = ["switchport", "spanning-tree", "vlan", "trunk"]
        keywords_firewall = ["security-zone", "firewall", "nat", "policy", "access-group", "permit"]
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
        if "cisco" in text_lower:
            predicted_vendor = "Cisco Systems"
        elif "juniper" in text_lower:
            predicted_vendor = "Juniper Networks"
        elif "palo" in text_lower:
            predicted_vendor = "Palo Alto Networks"
        elif "forti" in text_lower:
            predicted_vendor = "Fortinet"

        return {
            "vendor": predicted_vendor,
            "os_version": "Unknown OS",
            "device_type": predicted_type,
            "confidence": 0.65 if max_score > 0 else 0.40,
            "detection_method": "fallback_nlp_classifier"
        }

def detect_vendor(raw_config_text: str) -> Dict[str, Any]:
    return VendorDetectorEngine.detect_vendor(raw_config_text)
