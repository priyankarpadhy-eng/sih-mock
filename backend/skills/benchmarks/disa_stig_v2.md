---
skill_id: disa_stig_v2
skill_name: DISA STIG Password & Lockout Security Evaluator
category: benchmark
framework: DISA STIGs
---

# EVALUATION RULES

## DISA-IA-5: Reversible Password Encryption Prohibition
- Target Field: `authentication_security.password_encryption_types`
- Evaluation Logic: `'type_7' not in password_encryption_types and 'plaintext' not in password_encryption_types`
- Failure Severity: CRITICAL
- Control Ref: Control IA-5
- Description: Weak reversible Type 7 password encryption and plaintext passwords are prohibited.

## DISA-AC-7: Unsuccessful Logon Lockout
- Target Field: `access_control.login_block_failed_attempts`
- Evaluation Logic: `login_block_failed_attempts == True`
- Failure Severity: MEDIUM
- Control Ref: Control AC-7
- Description: Device must automatically block login attempts after consecutive failed tries.
