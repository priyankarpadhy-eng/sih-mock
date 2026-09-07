---
skill_id: vendor_sonic_whitebox
skill_name: SONiC Foundation Open-Source Network OS Skill
category: vendor
vendor: Sonic Foundation
os_version: SONiC OS
---

# SYNTAX RECOGNITION PATTERNS

- Header Keywords: `sonic-cli`, `openconfig-system`, `openconfig-interfaces`

# REMEDIATION SCRIPT TEMPLATES

## NIST-AC-12
```sonic
sonic-cli
configure terminal
  system idle-timeout 600
```
