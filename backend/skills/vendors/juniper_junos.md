---
skill_id: vendor_juniper_junos
skill_name: Juniper Networks JunOS Syntax Parser & Remediation Engine
category: vendor
vendor: Juniper Networks
os_version: JunOS
---

# SYNTAX RECOGNITION PATTERNS

- Header Keywords: `set security zones`, `set system host-name`, `groups {`
- Idle Timeout Regex: `set system login idle-timeout \d+`

# REMEDIATION SCRIPT TEMPLATES

## NIST-AC-12 & CIS-1.1.2
```junos
set system login idle-timeout 10
set system services ssh protocol-version v2
set system services telnet disable
```
