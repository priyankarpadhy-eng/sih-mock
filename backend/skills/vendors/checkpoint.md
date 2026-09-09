---
skill_id: vendor_checkpoint_gaia
skill_name: Check Point Quantum Security Gateway (Gaia OS) Skill
category: vendor
vendor: Check Point
os_version: Gaia R80.x - R81.x
---

# CHECK POINT GAIA OS AUDIT PROFILE

## 1. LOG FORMAT & SYSLOG DIALECT
Check Point Log Export (LEEF/CEF) or Gaia CLISH structured output:
- Pattern: `time="HH:MM:SS" action="drop|accept|reject" product="Firewall" src="10.0.5.22" dst="192.168.1.1" service="telnet" rule="10" ...`
- Admin Audit: `clish: User admin ran command 'set inactivity-timeout 0'`
- SmartConsole Audit: `Action: "Modify Policy", Administrator: "sec_ops"`

## 2. KNOWN-BENIGN NOISY LOGS (SUPPRESS)
- `product="ClusterXL" msg="Cluster member state is Active"` (High availability heartbeat)
- `product="Anti-Bot" msg="Contract verified with cloud"` (Threat intelligence check)
- `product="RAD" msg="URL filtering cache hit"` (Routine categorization)
- `product="Identity Awareness" msg="Kerberos ticket authenticated for host"`

## 3. VENDOR-SPECIFIC ATTACK SIGNATURES & MISCONFIG PATTERNS
- **Inactivity Timeout Disabled**: `set inactivity-timeout 0` -> Flag as NIST-AC-12 FAIL
- **Permissive Stealth Rule**: Firewall rule 0 allowing direct connections to gateway IP -> Flag as CIS-Firewall FAIL
- **Unencrypted SNMP Community**: `set snmp agent-version v1-v2c` or community `public` -> Flag as CIS-2.2 FAIL
- **Missing Web Banner**: `set web ssl-port ...` without legal pre-login banner -> Flag as DISA-STIG-002 FAIL
- **Telnet Service Running**: `set telnet-server status on` -> Flag as NIST-SC-8 FAIL

## 4. SAMPLE ANNOTATED LOG & CONFIG SNIPPETS
```checkpoint
set hostname "CP-GW-01"
set inactivity-timeout 0                                     # [FAIL: NIST-AC-12 Session timeout disabled]
set telnet-server status on                                  # [FAIL: NIST-SC-8 Telnet service active]
set snmp agent-version v1-v2c                                # [FAIL: CIS-2.2 Deprecated unencrypted SNMP]
set snmp community public read-only                          # [FAIL: CIS-2.2 Default public SNMP community]
set message pre-login "UNAUTHORIZED ACCESS FORBIDDEN."      # [PASS: Legal banner active]
```

## 5. HARDENING & ROLLBACK PLAYBOOKS
```checkpoint
# Hardening Sequence (CLISH)
set inactivity-timeout 10
set telnet-server status off
delete snmp community public
set snmp agent-version v3
save config

# Rollback Sequence
set inactivity-timeout 0
set telnet-server status on
save config
```
