---
skill_id: cisco_ios_rules
skill_name: Cisco IOS / IOS-XE Security Baseline Rules
category: vendor
vendor: cisco
framework: Cisco IOS Hardening
---

# CISCO IOS / IOS-XE SECURITY BASELINE EVALUATION RULES

## CISCO-SC-8-001: Control SC-8 Telnet Must Be Disabled on VTY Lines
- Target Field: `authentication_security.telnet_enabled`
- Evaluation Logic: `telnet_enabled == False`
- Failure Severity: CRITICAL
- Control Ref: NIST SC-8 / CIS Cisco IOS 1.1
- Description: Cisco IOS transport input telnet permits unencrypted CLI sessions. All VTY lines must restrict transport to SSH only using 'transport input ssh'.

## CISCO-AC-12-001: Control AC-12 VTY Exec Session Idle Timeout
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `exec_timeout_seconds > 0 and exec_timeout_seconds <= 600`
- Failure Severity: CRITICAL
- Control Ref: NIST AC-12 / DISA STIG NET001440
- Description: VTY lines must have exec-timeout configured to a value between 1 and 600 seconds (10 minutes). exec-timeout 0 0 means sessions never expire.

## CISCO-SC-8-002: Control SC-8 SSH Version 2 Mandatory
- Target Field: `authentication_security.ssh_version`
- Evaluation Logic: `ssh_version >= 2`
- Failure Severity: HIGH
- Control Ref: NIST SC-8 / CIS Cisco IOS 1.2
- Description: SSH version 1 contains known cryptographic weaknesses. Cisco IOS must enforce SSHv2 via 'ip ssh version 2'.

## CISCO-IA-5-001: Control IA-5 No Type-7 Password Obfuscation
- Target Field: `authentication_security.password_encryption_types`
- Evaluation Logic: `"type_7" not in password_encryption_types`
- Failure Severity: CRITICAL
- Control Ref: DISA IA-5 / CIS Cisco IOS 1.3
- Description: Cisco Type-7 passwords use reversible XOR obfuscation and are trivially decoded. All passwords must use enable secret with algorithm-type sha256 or scrypt.

## CISCO-AC-2-001: Control AC-2 VTY Access-Class Restriction
- Target Field: `access_control.management_acl_applied`
- Evaluation Logic: `management_acl_applied == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-2 / DISA STIG NET0400
- Description: VTY lines must have 'access-class' applied to restrict which source IPs can establish management sessions. Unrestricted VTY allows any host to attempt authentication.

## CISCO-AC-7-001: Control AC-7 Login Block-For Failed Attempts
- Target Field: `access_control.login_block_failed_attempts`
- Evaluation Logic: `login_block_failed_attempts == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-7 / DISA STIG NET001450
- Description: 'login block-for' must be configured to automatically block login attempts after a threshold of consecutive failures, preventing brute-force attacks.

## CISCO-AU-2-001: Control AU-2 Remote Syslog Forwarding
- Target Field: `network_and_services.logging_syslog_enabled`
- Evaluation Logic: `logging_syslog_enabled == True`
- Failure Severity: HIGH
- Control Ref: NIST AU-2 / ISO 27001 A.12
- Description: A remote syslog server must be configured via 'logging host' to forward audit events to a centralized SIEM collector. Local-only logging is insufficient.
