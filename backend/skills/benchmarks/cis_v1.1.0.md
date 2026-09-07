---
skill_id: cis_v1.1.0
skill_name: CIS Benchmark Hardening Evaluator
category: benchmark
framework: CIS Benchmarks
---

# EVALUATION RULES

## CIS-1.1.2: Mandatory SSHv2 Enforcement & Telnet Prohibition
- Target Field: `authentication_security.telnet_enabled`
- Evaluation Logic: `telnet_enabled == False and ssh_version == 2`
- Failure Severity: CRITICAL
- Control Ref: Section 1.1.2
- Description: Cleartext Telnet transport MUST be disabled and Secure Shell version 2 protocol MUST be strictly enforced.
