---
skill_id: palo_alto_rules
skill_name: Palo Alto Networks PAN-OS Security Baseline Rules
category: vendor
vendor: paloalto
framework: PAN-OS Hardening
---

# PALO ALTO PAN-OS SECURITY BASELINE EVALUATION RULES

## PANOS-SC-8-001: Control SC-8 Telnet Management Must Be Disabled
- Target Field: `authentication_security.telnet_enabled`
- Evaluation Logic: `telnet_enabled == False`
- Failure Severity: CRITICAL
- Control Ref: NIST SC-8 / CIS Palo Alto 1.1
- Description: Palo Alto management interfaces must not allow Telnet access. Only SSH or HTTPS are permitted for management. Telnet transmits credentials in cleartext.

## PANOS-AC-12-001: Control AC-12 Management Session Idle Timeout
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `exec_timeout_seconds > 0 and exec_timeout_seconds <= 600`
- Failure Severity: CRITICAL
- Control Ref: NIST AC-12 / PAN-OS Best Practices
- Description: The idle-timeout for management sessions must be configured between 1 and 600 seconds. A value of 0 means sessions never expire, violating NIST AC-12.

## PANOS-SC-8-002: Control SC-8 SSH Version 2 Only
- Target Field: `authentication_security.ssh_version`
- Evaluation Logic: `ssh_version >= 2`
- Failure Severity: HIGH
- Control Ref: NIST SC-8 / PAN-OS Hardening Guide
- Description: PAN-OS management SSH must be configured for SSHv2 only. SSH version 1 has known vulnerabilities and must not be permitted.

## PANOS-IA-5-001: Control IA-5 No Plaintext Passwords in Configuration
- Target Field: `authentication_security.password_encryption_types`
- Evaluation Logic: `"plaintext" not in password_encryption_types`
- Failure Severity: CRITICAL
- Control Ref: NIST IA-5 / CIS PAN-OS 1.3
- Description: No plaintext passwords may appear in PAN-OS configuration exports. All administrative passwords must use strong hashing. Configuration exports must be encrypted.

## PANOS-AU-2-001: Control AU-2 Syslog Profile Must Be Configured
- Target Field: `network_and_services.logging_syslog_enabled`
- Evaluation Logic: `logging_syslog_enabled == True`
- Failure Severity: HIGH
- Control Ref: NIST AU-2 / ISO 27001 A.12.4
- Description: A syslog server profile must be configured under Device > Server Profiles > Syslog, and log forwarding profiles must be assigned to security policies and system logs.

## PANOS-AC-2-001: Control AC-2 Management Access Must Use ACL
- Target Field: `access_control.management_acl_applied`
- Evaluation Logic: `management_acl_applied == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-2 / PAN-OS Hardening Guide
- Description: Management interface access must be restricted using permitted IP list in Device > Setup > Management > Permitted IP Addresses. Without this, any host can reach the management interface.

## PANOS-AC-7-001: Control AC-7 Failed Logins Must Be Limited
- Target Field: `access_control.login_block_failed_attempts`
- Evaluation Logic: `login_block_failed_attempts == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-7 / PAN-OS Best Practices
- Description: The failed login lockout must be configured under Device > Setup > Management to prevent brute force attacks on the management console.
