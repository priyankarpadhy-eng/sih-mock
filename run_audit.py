#!/usr/bin/env python3
"""
VectorNet Universal CLI Audit Runner (Team Vector | SIH 2026 PS 26155)
Orchestration: Detect Vendor -> Inject global.md + Vendor Skill -> Execute Audit
"""

import os
import sys
import json
import argparse

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.audit_orchestrator import audit_orchestrator
from backend.vendor_detector import detect_vendor
from backend.sample_configs import SAMPLE_CONFIGS

def main():
    parser = argparse.ArgumentParser(description="VectorNet Multi-Vendor Network Compliance Auditor")
    parser.add_argument("file", nargs="?", help="Path to raw network config or syslog dump (e.g. datasets/01_cisco_ios_cucme.cfg)")
    parser.add_argument("--vendor", "-v", help="Explicit vendor override (cisco, juniper, paloalto, fortinet, checkpoint)")
    parser.add_argument("--query", "-q", help="Optional specific audit query or question")
    parser.add_argument("--json", "-j", action="store_true", help="Output raw JSON results")

    args = parser.parse_args()

    # Load content
    if args.file and os.path.exists(args.file):
        with open(args.file, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()
        source_label = args.file
    else:
        print("[*] No input file provided. Loading default Cisco CUCME benchmark preset...")
        raw_text = SAMPLE_CONFIGS["cisco_cucme"]["raw"]
        source_label = "datasets/01_cisco_ios_cucme.cfg"

    print(f"\n{'='*70}")
    print(f"VECTORNET AGENTIC AUDIT ORCHESTRATOR")
    print(f"Target: {source_label} | Lines: {len(raw_text.splitlines())}")
    print(f"{'='*70}\n")

    result = audit_orchestrator.run_audit(raw_text, vendor=args.vendor, user_query=args.query)

    if args.json:
        print(json.dumps(result, indent=2))
        return

    det_vendor = result.get("detected_vendor", "Unknown")
    summary = result.get("deterministic_summary", {})
    score = summary.get("compliance_score", 0.0)
    findings = summary.get("findings", [])

    print(f"[+] Detected Hardware Vendor : {det_vendor}")
    print(f"[+] Skills Injected         : {', '.join(result.get('skills_injected', []))}")
    print(f"[+] Compliance Score        : {score}%")
    print(f"[+] Total Checks Evaluated  : {summary.get('total_checks', len(findings))}")
    print(f"[+] Violations Detected     : {summary.get('failed_checks', 0)}")
    print(f"[+] Warnings / Needs Review : {summary.get('warning_checks', 0)}")
    print(f"[+] Unobserved / Unknown    : {summary.get('unknown_checks', 0)}\n")

    print("--- 5-STATE AUDIT FINDINGS MATRIX ---")
    for f in findings:
        status = f.get("status", "UNKNOWN")
        rule_id = f.get("rule_id", "RULE")
        fw = f.get("framework", "GENERAL")
        title = f.get("title", "")
        span = f.get("line_span", {})
        l_start = span.get("line_start", 0)
        l_end = span.get("line_end", 0)
        line_str = f"L{l_start}-L{l_end}" if l_start else "UNOBSERVED"

        status_symbol = "[PASS]" if status == "PASS" else "[FAIL]" if status == "FAIL" else f"[{status}]"
        print(f"  {status_symbol:<8} {rule_id:<12} {fw:<16} {line_str:<12} {title}")

    if result.get("ai_response"):
        print("\n--- OPENROUTER AI TECHNICAL SYNTHESIS ---")
        ai_data = result["ai_response"]
        print(f"Model: {ai_data.get('model')} (Key Index: {ai_data.get('used_key_index')})")
        print(ai_data.get("content", ""))

    print(f"\n{'='*70}")
    print("Audit Complete. Ready for defense reporting and playbook remediation.")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    main()
