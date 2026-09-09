---
skill_id: vendor_fortinet_fortios
skill_name: Fortinet FortiOS Security & Compliance Skill
category: vendor
vendor: Fortinet
os_version: FortiOS 6.x - 7.x
---

# FORTINET FORTIOS AUDIT PROFILE

## 1. LOG FORMAT & SYSLOG DIALECT
Fortinet key-value structured syslog format:
- Structure: `date=YYYY-MM-DD time=HH:MM:SS devname="FG-TACTICAL" devid="FG100E..." type="traffic|event" subtype="system|admin" level="notice|warning|alert" logid="01000..." msg="..."`
- Auth Events: `subtype="admin" action="login" status="failed"`
- Privilege Changes: `msg="Administrator 'admin' changed config for 'system global'"`

## 2. KNOWN-BENIGN NOISY LOGS (SUPPRESS)
- `msg="FortiGuard update completed successfully"` (Automatic definition pull)
- `msg="DHCP lease IP 192.168.1.150 assigned to client"` (Routine local addressing)
- `subtype="ha" msg="Virtual cluster synchronization in sync"` (Cluster heartbeat)
- `msg="NTP server 10.0.0.1 synchronized"` (Normal clock tracking)

## 3. VENDOR-SPECIFIC ATTACK SIGNATURES & MISCONFIG PATTERNS
- **HTTP / Telnet Admin Access Active**: `set allowaccess ping https ssh http telnet` on external interface -> Flag as NIST-SC-8 FAIL
- **Admin Timeout Missing or Excessive**: `set admintimeout 0` or missing under `config system global` -> Flag as NIST-AC-12 FAIL
- **Pre-login Disclaimer Disabled**: `set pre-login-banner disable` -> Flag as DISA-STIG-002 FAIL
- **Default Port Utilization**: Admin port left on standard 443/80 without port offset or trusted host restriction.
- **Weak Cipher Suites**: `set strong-crypto disable` in system global.

## 4. SAMPLE ANNOTATED LOG & CONFIG SNIPPETS
```fortios
config system global
    set hostname "FGT-TACTICAL-01"
    set admintimeout 0                  # [FAIL: NIST-AC-12 Session timeout disabled]
    set pre-login-banner disable        # [FAIL: DISA-STIG-002 Legal banner missing]
    set strong-crypto disable           # [FAIL: NIST-IA-5 Weak crypto enabled]
end

config system interface
    edit "wan1"
        set mode static
        set allowaccess ping http telnet # [FAIL: NIST-SC-8 Cleartext web and telnet on WAN]
    next
end
```

## 5. HARDENING & ROLLBACK PLAYBOOKS
```fortios
# Hardening Sequence
config system global
    set admintimeout 10
    set pre-login-banner enable
    set strong-crypto enable
end
config system interface
    edit "wan1"
        set allowaccess ping https ssh
    next
end

# Rollback Sequence
config system global
    set admintimeout 0
    set pre-login-banner disable
end
```
