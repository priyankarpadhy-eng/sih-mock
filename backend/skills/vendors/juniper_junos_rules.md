---
skill_id: juniper_junos_rules
skill_name: Juniper JunOS Security Baseline Rules
category: vendor
vendor: juniper
framework: JunOS Hardening
---

# JUNIPER JUNOS SECURITY BASELINE EVALUATION RULES

## JUNOS-SC-8-001: Control SC-8 Telnet Must Be Disabled
- Target Field: `authentication_security.telnet_enabled`
- Evaluation Logic: `telnet_enabled == False`
- Failure Severity: CRITICAL
- Control Ref: NIST SC-8 / CIS Juniper 1.1
- Description: JunOS 'set system services telnet' enables insecure management. Telnet must not be configured under 'system services'. Only SSH must be permitted for interactive management.

## JUNOS-AC-12-001: Control AC-12 Session Idle Timeout
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `exec_timeout_seconds > 0 and exec_timeout_seconds <= 600`
- Failure Severity: CRITICAL
- Control Ref: NIST AC-12 / JunOS Hardening Guide
- Description: JunOS idle-timeout under 'system login' must be configured. Setting it to 0 or not configuring it means sessions never expire. Recommended maximum is 600 seconds.

## JUNOS-SC-8-002: Control SC-8 SSH Must Be Enabled
- Target Field: `authentication_security.ssh_version`
- Evaluation Logic: `ssh_version >= 2`
- Failure Severity: HIGH
- Control Ref: NIST SC-8 / CIS Juniper 1.2
- Description: JunOS must have SSH services enabled under 'set system services ssh'. SSH protocol v2 must be enforced. SSH v1 is deprecated and has known vulnerabilities.

## JUNOS-IA-5-001: Control IA-5 No Plaintext Passwords
- Target Field: `authentication_security.password_encryption_types`
- Evaluation Logic: `"plaintext" not in password_encryption_types`
- Failure Severity: CRITICAL
- Control Ref: NIST IA-5 / CIS Juniper 1.4
- Description: JunOS user accounts must use SHA-256 ($6$) or SHA-1 ($1$) encrypted passwords. Plaintext passwords in configuration are a critical security violation. All passwords must be hashed.

## JUNOS-AU-2-001: Control AU-2 Remote Syslog Must Be Active
- Target Field: `network_and_services.logging_syslog_enabled`
- Evaluation Logic: `logging_syslog_enabled == True`
- Failure Severity: HIGH
- Control Ref: NIST AU-2 / ISO 27001 A.12
- Description: JunOS must forward security events to a remote syslog server configured under 'set system syslog host'. Local-only logging is insufficient for forensic and compliance purposes.

## JUNOS-AC-2-001: Control AC-2 Management Access Must Be Restricted
- Target Field: `access_control.management_acl_applied`
- Evaluation Logic: `management_acl_applied == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-2 / JunOS Best Practices
- Description: JunOS management access must be restricted via firewall filters applied to the loopback interface (lo0) or using management VRF access restrictions. All administrative interfaces must have source-address restrictions.

## JUNOS-AC-7-001: Control AC-7 Login Attempt Limits
- Target Field: `access_control.login_block_failed_attempts`
- Evaluation Logic: `login_block_failed_attempts == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-7 / JunOS Hardening Guide
- Description: JunOS must configure 'set system login retry-options' to limit failed authentication attempts and enforce lockout, preventing brute-force attacks on management interfaces.
