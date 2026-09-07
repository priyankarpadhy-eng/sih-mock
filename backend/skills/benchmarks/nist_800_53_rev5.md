---
skill_id: nist_800_53_rev5
skill_name: NIST SP 800-53 Rev 5 Control Evaluator
category: benchmark
framework: NIST SP 800-53 (Rev 5)
---

# EVALUATION RULES

## NIST-AC-12: Control AC-12 Session Inactivity Logout
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `exec_timeout_seconds > 0 and exec_timeout_seconds <= 600`
- Failure Severity: CRITICAL
- Control Ref: Control AC-12
- Description: Inactive administrative sessions must automatically terminate after 10 minutes.

## NIST-SC-8: Control SC-8 Transmission Confidentiality (No Telnet)
- Target Field: `authentication_security.telnet_enabled`
- Evaluation Logic: `telnet_enabled == False`
- Failure Severity: HIGH
- Control Ref: Control SC-8
- Description: Insecure, plaintext management protocols like Telnet must be disabled.

## NIST-AC-2: Control AC-2 Access Control List Enforcement
- Target Field: `access_control.management_acl_applied`
- Evaluation Logic: `management_acl_applied == True`
- Failure Severity: HIGH
- Control Ref: Control AC-2
- Description: Remote management access must be restricted via VTY access-class lists.
