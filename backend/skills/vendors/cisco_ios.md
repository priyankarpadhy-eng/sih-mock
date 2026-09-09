---
skill_id: vendor_cisco_ios
skill_name: Cisco Systems IOS / IOS-XE & CUCME Audit Skill
category: vendor
vendor: Cisco Systems
os_version: IOS / IOS-XE 15.x - 17.x, CUCME
---

# CISCO SYSTEMS IOS / IOS-XE AUDIT PROFILE

## 1. LOG FORMAT & SYSLOG DIALECT
Cisco standard facility-severity-mnemonic structure:
- Pattern: `%<FACILITY>-<SEVERITY>-<MNEMONIC>: <MESSAGE_TEXT>`
- Severity Levels: `0` (Emergencies) to `7` (Debugging)
- Example: `%SYS-5-CONFIG_I: Configured from console by admin on vty0 (10.0.5.22)`
- Auth Failures: `%SEC_LOGIN-4-LOGIN_FAILED`, `%SSH-4-SSH2_LOGON_UNAUTH`
- Cleartext Alert: `%TELNET-3-CONN_ESTABLISHED`

## 2. KNOWN-BENIGN NOISY LOGS (SUPPRESS)
- `%LINK-3-UPDOWN: Interface GigabitEthernet0/0/1, changed state to up` (Scheduled link negotiation)
- `%SYS-6-LOGGINGHOST_STARTSTOP: Logging to host 10.0.100.50 started` (Normal telemetry initialization)
- `%OSPF-5-ADJCHANGE: Process 1, Nbr 10.0.0.2 on GigabitEthernet0/0/0 from LOADING to FULL` (Routine routing adjacency)
- `%LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback0, changed state to up`

## 3. VENDOR-SPECIFIC ATTACK SIGNATURES & MISCONFIG PATTERNS
- **Type-7 Weak Encryption**: `password 7 0822455D0A16` (Easily reversible XOR cipher) -> Flag as DISA-IA-5 FAIL
- **Telnet Allowed on VTY**: `transport input telnet` or `transport input all` or `transport input telnet ssh` -> Flag as NIST-SC-8 FAIL
- **Infinite Exec Timeout**: `exec-timeout 0 0` or missing under `line con 0` / `line vty` -> Flag as NIST-AC-12 FAIL
- **Default SNMP Strings**: `snmp-server community public RO` or `snmp-server community private RW` -> Flag as CIS-2.2 FAIL
- **Missing Banner**: Absence of `banner motd` or `banner login` -> Flag as DISA-STIG-002 FAIL
- **SSH v1 Downgrade**: `ip ssh version 1` -> Flag as CIS-1.1 FAIL

## 4. SAMPLE ANNOTATED LOG & CONFIG SNIPPETS
```cisco
! MISCONFIGURATION: Weak type-7 password and telnet enabled on VTY lines
hostname TAC-ROUTER-01
enable secret 5 $1$mER7$vX3Y80x1g0f7    ! [WARNING: MD5 is deprecated, migrate to Type-9 scrypt]
service password-encryption
!
username backup privilege 15 password 7 0822455D0A16 ! [FAIL: DISA-IA-5 Type-7 reversible hash]
!
line vty 0 4
 exec-timeout 0 0                       ! [FAIL: NIST-AC-12 Infinite timeout]
 transport input telnet ssh             ! [FAIL: NIST-SC-8 Telnet enabled]
!
snmp-server community public RO         ! [FAIL: CIS-2.2 Default community string]
```

## 5. HARDENING & ROLLBACK PLAYBOOKS
```cisco
! Hardening Sequence
configure terminal
 username backup secret <STRONG_PASSWORD>
 line vty 0 4
  transport input ssh
  exec-timeout 10 0
  exit
 no snmp-server community public
 no snmp-server community private
 snmp-server group SECGROUP v3 auth privacy
exit

! Atomic Rollback Sequence
configure terminal
 line vty 0 4
  exec-timeout 0 0
  transport input telnet ssh
exit
```
