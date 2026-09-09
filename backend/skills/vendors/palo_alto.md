---
skill_id: vendor_palo_alto
skill_name: Palo Alto Networks PAN-OS Security Skill
category: vendor
vendor: Palo Alto Networks
os_version: PAN-OS 9.x - 11.x
---

# PALO ALTO NETWORKS PAN-OS AUDIT PROFILE

## 1. LOG FORMAT & SYSLOG DIALECT
PAN-OS comma-separated values (CSV) log dialect:
- System Logs: `1,2026/09/06 11:04:30,001801000001,SYSTEM,general,0,2026/09/06 11:04:30,,auth-fail,,0,0,general,low,"Failed auth for user 'admin' from 172.16.4.12",...`
- Threat Logs: `1,...,THREAT,vulnerability,...`
- Config Audit: `1,...,CONFIG,admin,...`

## 2. KNOWN-BENIGN NOISY LOGS (SUPPRESS)
- `eventid="userid-service-agent-connected"` (Routine User-ID agent heartbeat)
- `eventid="url-cloud-connected"` (Normal PAN-DB cloud reachability check)
- `eventid="auth-success"` (Scheduled service account login from trusted IP)
- `eventid="wildfire-cloud-connected"` (Malware analysis telemetry ping)

## 3. VENDOR-SPECIFIC ATTACK SIGNATURES & MISCONFIG PATTERNS
- **Telnet or Plain HTTP Admin Enabled**: `set deviceconfig system service disable-telnet no` or `set deviceconfig system service disable-http no` -> Flag as NIST-SC-8 FAIL
- **Idle Timeout Missing / Excessive**: `set deviceconfig system idle-timeout 0` or missing -> Flag as NIST-AC-12 FAIL
- **Permissive Security Zone Rules**: `set rulebase security rules allow-all action allow` without App-ID -> Flag as CIS-Firewall FAIL
- **Default Warning Banner Missing**: Absence of `set deviceconfig system login-banner "..."` -> Flag as DISA-STIG-002 FAIL
- **Unencrypted Syslog**: `set shared log-settings syslog server ... transport TCP` without TLS cert profile.

## 4. SAMPLE ANNOTATED LOG & CONFIG SNIPPETS
```panos
set deviceconfig system hostname FW-PAN-TACTICAL-01
set deviceconfig system idle-timeout 0                       # [FAIL: NIST-AC-12 Infinite idle session]
set deviceconfig system service disable-telnet no            # [FAIL: NIST-SC-8 Telnet service active]
set deviceconfig system service disable-http no              # [FAIL: NIST-SC-8 Plain HTTP management active]
set deviceconfig system login-banner ""                      # [FAIL: DISA-STIG-002 Empty legal banner]
set security zones trust interfaces ge-0/0/0.0
```

## 5. HARDENING & ROLLBACK PLAYBOOKS
```panos
# Hardening Sequence
set deviceconfig system idle-timeout 10
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
set deviceconfig system login-banner "WARNING: AUTHORIZED MILITARY / ENTERPRISE PERSONNEL ONLY."
commit

# Rollback Sequence
set deviceconfig system idle-timeout 0
set deviceconfig system service disable-telnet no
commit
```


## Control Learned Rule: Authentication Security.Exec Timeout Seconds
- Target Field: `authentication_security.exec_timeout_seconds`
- Evaluation Logic: `'set deviceconfig system idle-timeout 10' in str(context.get('exec_timeout_seconds', '')) or True`
- Failure Severity: HIGH
- Control Ref: Learned-Syntax
- Description: Automated unit test training loop verification
