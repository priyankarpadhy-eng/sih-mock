---
skill_id: vendor_juniper_junos
skill_name: Juniper Networks Junos OS Security Skill
category: vendor
vendor: Juniper Networks
os_version: Junos OS 19.x - 22.x
---

# JUNIPER NETWORKS JUNOS OS AUDIT PROFILE

## 1. LOG FORMAT & SYSLOG DIALECT
Junos structured syslog format:
- Structure: `<TIMESTAMP> <HOSTNAME> <PROCESS>[<PID>]: %<FACILITY>-<SEVERITY>-<TAG>: <MESSAGE>`
- Auth Failures: `sshd[12345]: Failed password for root from 10.0.0.99 port 52311 ssh2`
- Configuration Commits: `mgd[876]: UI_COMMIT_COMPLETED: by user 'admin'`

## 2. KNOWN-BENIGN NOISY LOGS (SUPPRESS)
- `rpd[...]: RPD_BGP_NEIGHBOR_STATE_CHANGED: BGP neighbor ... established` (Routine peer refresh)
- `chassisd[...]: CHASSISD_FAN_STATUS_NOTICE: Fan operating normally` (Environmental telemetry)
- `mgd[...]: UI_DBASE_LOGOUT: User 'super' has logged out` (Normal session exit)
- `snmpd[...]: SNMPD_AUTH_FAILURE: Community name: public` (Handled by policy)

## 3. VENDOR-SPECIFIC ATTACK SIGNATURES & MISCONFIG PATTERNS
- **Telnet Service Active**: Absence of `set system services telnet disable` -> Flag as NIST-SC-8 FAIL
- **Direct Root Login via SSH**: `set system services ssh root-login allow` -> Flag as DISA-IA-5 FAIL
- **Infinite Idle Timeout**: Missing `set system login idle-timeout <MINUTES>` -> Flag as NIST-AC-12 FAIL
- **Missing Remote Syslog**: Absence of `set system syslog host <IP>` -> Flag as ISO-27001-A12 FAIL
- **Missing Statutory Banner**: Absence of `set system login message "..."` -> Flag as DISA-STIG-002 FAIL

## 4. SAMPLE ANNOTATED LOG & CONFIG SNIPPETS
```junos
set system host-name BGP-JUNOS-01
set system services ssh root-login allow                     # [FAIL: DISA-IA-5 Direct root SSH login allowed]
# Missing: set system services telnet disable                # [FAIL: NIST-SC-8 Telnet enabled by omission]
# Missing: set system login idle-timeout 10                  # [FAIL: NIST-AC-12 Session timeout missing]
set system login message ""                                  # [FAIL: DISA-STIG-002 Empty legal warning banner]
set system syslog host 10.0.100.50 any info                  # [PASS: Central remote logging active]
```

## 5. HARDENING & ROLLBACK PLAYBOOKS
```junos
# Hardening Sequence
set system services telnet disable
set system services ssh root-login deny
set system login idle-timeout 10
set system login message "UNAUTHORIZED ACCESS PROHIBITED. ALL SESSIONS MONITORED."
commit and-quit

# Rollback Sequence
delete system services telnet disable
set system services ssh root-login allow
delete system login idle-timeout
commit and-quit
```
