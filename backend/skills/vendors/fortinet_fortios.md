---
skill_id: vendor_fortinet_fortios
skill_name: Fortinet FortiOS Syntax Parser & Remediation Engine
category: vendor
vendor: Fortinet
os_version: FortiOS
---

# SYNTAX RECOGNITION PATTERNS

- Header Keywords: `config system global`, `config log syslogd`, `fortigate`
- Admin Timeout Regex: `set admintimeout (\d+)`
- HTTPS Enforce: `set admin-https-redirect enable`
- Pre-login Banner: `set pre-login-banner enable`

# REMEDIATION SCRIPT TEMPLATES

## NIST-AC-12 & CIS-1.1.2
```fortios
config system global
    set admintimeout 10
    set admin-https-redirect enable
end
```

## NIST-SC-8
```fortios
config system interface
    edit "port1"
        set allowaccess https ssh ping
    next
end
```

## CIS-2.2
```fortios
config system snmp community
    delete 1
end
```
