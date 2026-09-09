"""
End-to-end audit pipeline test.
Tests: normalization → rule evaluation → deterministic report
Without requiring Ollama running.
"""

import sys, json
sys.path.insert(0, '.')

TEST_CISCO_CONFIG = """
version 15.5
hostname ROUTER-01
!
service password-encryption
!
username admin password 7 14141B180F0B
enable secret 5 $1$mERr$hx5rVt7rPNoS4wqbXKX7m0
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
line vty 0 4
 transport input telnet ssh
 exec-timeout 0 0
 login local
!
no ntp server
snmp-server community public RO
no logging host 10.0.0.1
!
end
"""

print("=" * 70)
print("TEST: Cisco IOS Config with Multiple Violations")
print("=" * 70)
print(f"Config length: {len(TEST_CISCO_CONFIG)} chars")
print()

from app.engines.normalizer import ConfigNormalizer
from app.engines.compliance import ComplianceEngine
from app.engines.task_classifier import classify_task

# Step 1: Normalize
sbm = ConfigNormalizer.parse_config(TEST_CISCO_CONFIG)
norm = ConfigNormalizer.normalize_to_universal_schema(TEST_CISCO_CONFIG)

print("NORMALIZATION RESULTS:")
print(f"  Vendor: {norm['device']['vendor']}")
print(f"  Hostname: {norm['device']['hostname']}")
print(f"  SSH version: {norm['security']['authentication']['ssh_version']}")
print(f"  Telnet enabled: {norm['security']['authentication']['telnet_enabled']}")
print(f"  Exec timeout: {norm['security']['authentication']['exec_timeout_seconds']}s")
print(f"  Password types: {norm['security']['authentication']['password_encryption_types']}")
print(f"  SNMP community default: {norm['security']['snmp']['default_community_strings_detected']}")
print()

# Step 2: Compliance evaluation
summary = ComplianceEngine.evaluate_compliance(sbm)
print(f"COMPLIANCE SUMMARY:")
print(f"  Score: {summary.compliance_score}%")
print(f"  Total checks: {summary.total_checks}")
print(f"  Passed: {summary.passed_checks}")
print(f"  Failed: {summary.failed_checks}")
print(f"  Unknown: {summary.unknown_checks}")
print()

print("FINDINGS:")
for finding in summary.findings:
    icon = "✅" if finding.status.value == "PASS" else ("❌" if finding.status.value == "FAIL" else "⚠️")
    print(f"  {icon} [{finding.status.value}] [{finding.severity.value}] {finding.rule_id}: {finding.title[:60]}")
    if finding.status.value != "PASS":
        print(f"     Observed: {finding.observed_value[:80]}")
        
print()

# Step 3: Task classification
task = classify_task(TEST_CISCO_CONFIG, "audit all security controls", "Cisco")
print(f"TASK CLASSIFICATION:")
print(f"  Sensitivity: {task.sensitivity} (cloud allowed: {task.cloud_allowed})")
print(f"  Task type: {task.task_type}")
print(f"  Secrets found: {task.secret_patterns_found}")
print(f"  Estimated input tokens: {task.estimated_input_tokens}")

print()
print("=" * 70)
print("✅ Pipeline complete — no dummy data, all real findings from config")
print("=" * 70)
