"""
VectorNet Demo Test Suite: Multi-Vendor Error / No-Error Verification
======================================================================
Tests compliant (no-error) and vulnerable (with-error) configurations
across Cisco, Palo Alto, Juniper, Fortinet, and multi-vendor combinations.
"""

import os
import sys
sys.path.insert(0, ".")

from backend.app.engines.normalizer import ConfigNormalizer
from backend.app.engines.compliance import ComplianceEngine

TEST_FILES = [
    # Individual Vendors - Compliant (No Error)
    ("Cisco IOS (Clean)", "demo_test_cases/cisco/cisco_compliant.cfg", "COMPLIANT"),
    ("Palo Alto (Clean)", "demo_test_cases/palo_alto/paloalto_compliant.txt", "COMPLIANT"),
    ("Juniper Junos (Clean)", "demo_test_cases/juniper/juniper_compliant.conf", "COMPLIANT"),
    ("Fortinet FortiOS (Clean)", "demo_test_cases/fortinet/fortinet_compliant.conf", "COMPLIANT"),

    # Individual Vendors - Vulnerable (With Errors)
    ("Cisco IOS (Vulnerable)", "demo_test_cases/cisco/cisco_vulnerable.cfg", "NON-COMPLIANT"),
    ("Palo Alto (Vulnerable)", "demo_test_cases/palo_alto/paloalto_vulnerable.txt", "NON-COMPLIANT"),
    ("Juniper Junos (Vulnerable)", "demo_test_cases/juniper/juniper_vulnerable.conf", "NON-COMPLIANT"),
    ("Fortinet FortiOS (Vulnerable)", "demo_test_cases/fortinet/fortinet_vulnerable.conf", "NON-COMPLIANT"),

    # Multi-Vendor Combinations
    ("Combo: Cisco Error + Palo Alto Clean", "demo_test_cases/combinations/combo_cisco_error_paloalto_clean.txt", "DETECTS_ERRORS"),
    ("Combo: Cisco Clean + Fortinet Error", "demo_test_cases/combinations/combo_cisco_clean_fortinet_error.txt", "DETECTS_ERRORS"),
    ("Combo: 4-Vendor Heterogeneous Stream", "demo_test_cases/combinations/combo_four_vendors_mixed_audit.txt", "DETECTS_ERRORS"),
]

def run_tests():
    print("\n" + "=" * 90)
    print("VECTORNET MULTI-VENDOR COMPLIANCE VERIFICATION MATRIX")
    print("=" * 90 + "\n")

    format_row = "{:<38} | {:<18} | {:<7} | {:<25}"
    print(format_row.format("Test Configuration", "Detected Vendor", "Score", "Violations / Verdict"))
    print("-" * 90)

    for label, filepath, expected_type in TEST_FILES:
        if not os.path.exists(filepath):
            print(format_row.format(label, "MISSING", "-", "FAILED"))
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        sbm = ConfigNormalizer.parse_config(content)
        summary = ComplianceEngine.evaluate_compliance(sbm)

        score = f"{summary.compliance_score}%"
        failed_rules = [f.rule_id for f in summary.findings if f.status.value in ("FAIL", "WARNING")]
        failed_count = len(failed_rules)
        detected_vendor = sbm.device_metadata.vendor

        if expected_type == "COMPLIANT":
            passed = failed_count == 0
            verdict = "PASS (0 Errors)" if passed else f"FAIL ({failed_count} errors)"
        elif expected_type == "NON-COMPLIANT":
            passed = failed_count > 0
            verdict = f"DETECTED ({failed_count} violations)" if passed else "FAILED TO DETECT"
        else:
            passed = failed_count > 0
            verdict = f"DETECTED ({failed_count} violations)" if passed else "FAILED"

        icon = "[PASS]" if passed else "[FAIL]"
        verdict_str = f"{icon} {verdict}"
        print(format_row.format(label, detected_vendor[:18], score, verdict_str))

    print("\n" + "=" * 90)
    print("ALL DEMO TEST CASES SUCCESSFULLY EVALUATED")
    print("=" * 90 + "\n")

if __name__ == "__main__":
    run_tests()
