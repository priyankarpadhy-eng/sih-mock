---
skill_id: fortinet_fortios_rules
skill_name: Fortinet FortiOS Security Baseline Rules
category: vendor
vendor: fortinet
framework: Fortinet FortiOS Hardening
---

# FORTINET FORTIOS SECURITY BASELINE EVALUATION RULES

## FORTI-AC-12-001: Control AC-12 Admin Session Timeout Must Be Configured
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `exec_timeout_seconds > 0 and exec_timeout_seconds <= 480`
- Failure Severity: CRITICAL
- Control Ref: NIST AC-12 / Fortinet Security Hardening Guide
- Description: FortiGate admintimeout defines the idle session timeout in minutes. Setting it to 0 disables the timeout entirely (sessions never expire). Must be <= 8 minutes (480 seconds).

## FORTI-SC-8-001: Control SC-8 Telnet Must Be Disabled on All Interfaces
- Target Field: `authentication_security.telnet_enabled`
- Evaluation Logic: `telnet_enabled == False`
- Failure Severity: CRITICAL
- Control Ref: NIST SC-8 / CIS FortiGate 1.1
- Description: FortiGate 'set allowaccess telnet' permits unencrypted management access. Telnet must not be in the allowaccess list on any management interface. Use SSH or HTTPS only.

## FORTI-SC-8-002: Control SC-8 SSH Must Be Enabled for Secure Management
- Target Field: `authentication_security.ssh_version`
- Evaluation Logic: `ssh_version >= 2`
- Failure Severity: HIGH
- Control Ref: NIST SC-8 / CIS FortiGate 1.2
- Description: SSH must be explicitly enabled in allowaccess on the management interface. SSH version 2 must be the only permitted version.

## FORTI-IA-5-001: Control IA-5 HTTPS Redirect Must Be Enabled
- Target Field: `authentication_and_access.https_management_enabled`
- Evaluation Logic: `https_management_enabled == True and http_management_enabled == False`
- Failure Severity: HIGH
- Control Ref: NIST IA-5 / Fortinet Best Practice
- Description: HTTP administrative access must be disabled and HTTPS redirect enforced. 'set admin-https-redirect enable' prevents cleartext transmission of credentials and management sessions.

## FORTI-SC-15-001: Control SC-15 Default SNMP Community Strings Prohibited
- Target Field: `network_and_services.snmp_read_community_default`
- Evaluation Logic: `snmp_read_community_default == False`
- Failure Severity: HIGH
- Control Ref: NIST SC-15 / CIS FortiGate 2.1
- Description: Default SNMP community strings ('public' or 'private') must be removed or disabled. Use dedicated restricted community strings or migrate to SNMPv3 with SHA/AES encryption.

## FORTI-AU-2-001: Control AU-2 Remote Syslog Must Be Configured and Enabled
- Target Field: `network_and_services.logging_syslog_enabled`
- Evaluation Logic: `logging_syslog_enabled == True`
- Failure Severity: HIGH
- Control Ref: NIST AU-2 / ISO 27001 A.12
- Description: FortiGate 'config log syslogd' must be configured with a remote syslog server and status must be enabled. Log events to a centralized SIEM for forensic integrity.

## FORTI-AC-2-001: Control AC-2 Management Interface Access Must Be Restricted
- Target Field: `access_control.management_acl_applied`
- Evaluation Logic: `management_acl_applied == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-2 / Fortinet Hardening Guide
- Description: Administrative access must be restricted to trusted management IP ranges using trusted host configuration on admin accounts or management VDOM. Unrestricted management access violates least-privilege.

## FORTI-AC-7-001: Control AC-7 Admin Lockout Must Be Configured
- Target Field: `access_control.login_block_failed_attempts`
- Evaluation Logic: `login_block_failed_attempts == True`
- Failure Severity: HIGH
- Control Ref: NIST AC-7 / Fortinet Security Hardening
- Description: 'set admin-lockout-threshold' and 'set admin-lockout-duration' must be configured to lock admin accounts after repeated failed login attempts, preventing brute-force attacks.
